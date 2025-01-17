import pytest
from django.conf import settings
from scorer.test.conftest import (
    sample_address,
    sample_provider,
    verifiable_credential,
    sample_token,
    api_key,
)


@pytest.fixture
def sample_addresses():
    return ["0x123", "0x456", "0x789"]


@pytest.fixture
def sample_providers():
    return ["Twitter", "Github", "LinkedIn"]


@pytest.fixture
def sample_stamps():
    return [
        {"stamp": 1},
        {"stamp": 2},
        {"stamp": 3},
    ]


def pytest_configure():
    try:
        settings.CERAMIC_CACHE_API_KEY = "supersecret"
    except:
        pass
