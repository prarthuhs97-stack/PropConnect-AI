"""
Step 1 tests: technical failures must be reported as errors, while genuine
abstentions (the model cannot answer from approved facts) stay abstentions.

Also checks that diagnostic logs never contain buyer text or model output.
"""

import logging
from types import SimpleNamespace

import httpx
import pytest

from routes import chat as chat_module
from routes.chat import (
    ABSTAIN_REPLY,
    ERROR_REPLY,
    LLMUnavailable,
    answer_from_facts,
    ask_question,
)

FACTS = [
    {
        "id": 1,
        "category": "Pricing",
        "question": "What is the starting price?",
        "answer": "Prices start at 85 lakh.",
    }
]

GOOD_JSON = (
    '{"answer": "Prices start at 85 lakh.", '
    '"grounded": true, "source_fact_ids": [1]}'
)
MODEL_ABSTAINS_JSON = (
    '{"answer": "I am not sure.", "grounded": false, "source_fact_ids": []}'
)

BUYER_PRIVATE_TEXT = "my phone number is 9876543210"
SECRET_MODEL_TEXT = "SECRET-MODEL-TEXT"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def fast_and_keyed(monkeypatch):
    """No real sleeping between retries, and a fake API key by default."""
    monkeypatch.setattr(chat_module.time, "sleep", lambda seconds: None)
    monkeypatch.setattr(
        chat_module, "settings", SimpleNamespace(GROQ_API_KEY="test-key")
    )


class FakeResponse:
    def __init__(self, status_code=200, body=None):
        self.status_code = status_code
        self._body = body if body is not None else {}

    def json(self):
        return self._body


def patch_post(monkeypatch, handler):
    """Replace httpx.post and record how many times it was called."""
    calls = []

    def fake_post(*args, **kwargs):
        calls.append(kwargs)
        return handler()

    monkeypatch.setattr(chat_module.httpx, "post", fake_post)
    return calls


def raise_timeout():
    raise httpx.ReadTimeout("timed out")


def assert_error(result):
    assert result["status"] == "error"
    assert result["answer"] == ERROR_REPLY
    assert result["grounded"] is False
    assert result["contact_sales"] is False
    assert result["source_fact_ids"] == []
    assert result["source_fact_id"] is None


def assert_abstained(result):
    assert result["status"] == "abstained"
    assert result["answer"] == ABSTAIN_REPLY
    assert result["grounded"] is False
    assert result["contact_sales"] is True
    assert result["source_fact_ids"] == []
    assert result["source_fact_id"] is None


class FakeDB:
    """Just enough of a SQLAlchemy session for ask_question()."""

    def __init__(self, facts):
        self.facts = facts

    def query(self, *args):
        return self

    def filter(self, *args):
        return self

    def all(self):
        return list(self.facts)


def make_request(question, history=None):
    return SimpleNamespace(project_id=1, question=question, history=history or [])


# ---------------------------------------------------------------------------
# Technical failures -> status "error"
# ---------------------------------------------------------------------------
def test_missing_api_key_is_an_error(monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)
    monkeypatch.setattr(
        chat_module, "settings", SimpleNamespace(GROQ_API_KEY="")
    )
    calls = patch_post(monkeypatch, lambda: FakeResponse())

    result = answer_from_facts("What is the price?", FACTS)

    assert_error(result)
    assert calls == []  # no request is sent without a key
    assert "Groq API key is missing" in caplog.text


def test_timeout_is_an_error_after_one_retry(monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)
    calls = patch_post(monkeypatch, raise_timeout)

    result = answer_from_facts("What is the price?", FACTS)

    assert_error(result)
    assert len(calls) == 2
    assert "ReadTimeout" in caplog.text  # the cause type, not its message


@pytest.mark.parametrize(
    "status_code, expected_calls",
    [(401, 1), (403, 1), (429, 2), (500, 2), (503, 2)],
)
def test_http_failures_are_errors(monkeypatch, caplog, status_code, expected_calls):
    caplog.set_level(logging.DEBUG)
    calls = patch_post(monkeypatch, lambda: FakeResponse(status_code))

    result = answer_from_facts("What is the price?", FACTS)

    assert_error(result)
    assert len(calls) == expected_calls  # auth errors are not retried
    assert f"HTTP {status_code}" in caplog.text


def test_malformed_groq_body_is_an_error(monkeypatch):
    patch_post(monkeypatch, lambda: FakeResponse(200, {"unexpected": True}))

    assert_error(answer_from_facts("What is the price?", FACTS))


def test_empty_groq_content_is_an_error(monkeypatch):
    body = {"choices": [{"message": {"content": "   "}}]}
    patch_post(monkeypatch, lambda: FakeResponse(200, body))

    assert_error(answer_from_facts("What is the price?", FACTS))


def test_unexpected_exception_is_an_error(monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)
    monkeypatch.setattr(chat_module, "_call_groq", lambda messages: GOOD_JSON)

    def broken_validator(raw, facts):
        raise RuntimeError(f"boom {BUYER_PRIVATE_TEXT}")

    monkeypatch.setattr(chat_module, "evaluate_llm_output", broken_validator)

    result = answer_from_facts("What is the price?", FACTS)

    assert_error(result)
    assert "RuntimeError" in caplog.text
    assert BUYER_PRIVATE_TEXT not in caplog.text  # message is never logged


# ---------------------------------------------------------------------------
# Genuine abstentions stay abstentions
# ---------------------------------------------------------------------------
def test_model_abstention_is_not_an_error(monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)
    monkeypatch.setattr(
        chat_module, "_call_groq", lambda messages: MODEL_ABSTAINS_JSON
    )

    result = answer_from_facts("Is there a swimming pool?", FACTS)

    assert_abstained(result)
    assert [r for r in caplog.records if r.levelno >= logging.WARNING] == []


def test_failed_validation_abstains_and_logs_no_model_text(monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)
    # Cites fact 99, which is not an approved fact, so validation rejects it.
    bad = (
        '{"answer": "%s", "grounded": true, "source_fact_ids": [99]}'
        % SECRET_MODEL_TEXT
    )
    monkeypatch.setattr(chat_module, "_call_groq", lambda messages: bad)

    result = answer_from_facts("What is the price?", FACTS)

    assert_abstained(result)
    assert "rejected by validation" in caplog.text
    assert SECRET_MODEL_TEXT not in caplog.text


def test_validation_is_not_weakened_for_unsupported_numbers(monkeypatch):
    # 90 does not appear in the cited fact, so this must still be rejected.
    made_up = (
        '{"answer": "Prices start at 90 lakh.", '
        '"grounded": true, "source_fact_ids": [1]}'
    )
    monkeypatch.setattr(chat_module, "_call_groq", lambda messages: made_up)

    assert_abstained(answer_from_facts("What is the price?", FACTS))


def test_valid_grounded_answer_still_works(monkeypatch):
    monkeypatch.setattr(chat_module, "_call_groq", lambda messages: GOOD_JSON)

    result = answer_from_facts("What is the price?", FACTS)

    assert result["status"] == "answered"
    assert result["grounded"] is True
    assert result["answer"] == "Prices start at 85 lakh."
    assert result["source_fact_ids"] == [1]
    assert result["source_fact_id"] == 1
    assert result["contact_sales"] is False


# ---------------------------------------------------------------------------
# Logging hygiene
# ---------------------------------------------------------------------------
def test_groq_failure_logs_do_not_contain_buyer_text(monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)
    patch_post(monkeypatch, raise_timeout)

    answer_from_facts(f"What is the price? {BUYER_PRIVATE_TEXT}", FACTS)

    assert "9876543210" not in caplog.text
    assert BUYER_PRIVATE_TEXT not in caplog.text


# ---------------------------------------------------------------------------
# ask_question() now reuses answer_from_facts()
# ---------------------------------------------------------------------------
def test_ask_question_passes_history_to_the_model(monkeypatch):
    captured = {}

    def fake_call(messages):
        captured["messages"] = messages
        return GOOD_JSON

    monkeypatch.setattr(chat_module, "_call_groq", fake_call)
    history = [{"role": "user", "content": "Tell me about 2 BHK"}]

    result = ask_question(
        make_request("And the price?", history), db=FakeDB(FACTS)
    )

    assert result["status"] == "answered"
    roles = [m["role"] for m in captured["messages"]]
    assert roles == ["system", "user", "user"]
    assert captured["messages"][1]["content"] == "Tell me about 2 BHK"
    assert captured["messages"][2]["content"] == "And the price?"


def test_ask_question_negotiation_never_calls_the_model(monkeypatch):
    def must_not_run(messages):
        raise AssertionError("the model must not be called")

    monkeypatch.setattr(chat_module, "_call_groq", must_not_run)

    result = ask_question(make_request("Can I get a discount?"), db=FakeDB(FACTS))

    assert result["status"] == "contact_sales"
    assert result["contact_sales"] is True


def test_ask_question_without_facts_abstains_without_calling_the_model(monkeypatch):
    def must_not_run(messages):
        raise AssertionError("the model must not be called")

    monkeypatch.setattr(chat_module, "_call_groq", must_not_run)

    result = ask_question(make_request("What is the price?"), db=FakeDB([]))

    assert_abstained(result)


def test_ask_question_reports_technical_errors(monkeypatch):
    def unavailable(messages):
        raise LLMUnavailable("Groq returned HTTP 401")

    monkeypatch.setattr(chat_module, "_call_groq", unavailable)

    result = ask_question(make_request("What is the price?"), db=FakeDB(FACTS))

    assert_error(result)