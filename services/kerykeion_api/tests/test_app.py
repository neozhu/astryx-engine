import importlib.util
from pathlib import Path

from fastapi.testclient import TestClient

APP_PATH = Path(__file__).resolve().parents[1] / "app.py"
SPEC = importlib.util.spec_from_file_location("kerykeion_api_app", APP_PATH)
assert SPEC and SPEC.loader
app_module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(app_module)
app = app_module.app


def test_natal_endpoint_returns_astrologer_shaped_payload(monkeypatch):
    class FakePoint:
        def __init__(self, sign, house=None, name=None, position=None, abs_pos=None):
            self.sign = sign
            self.house = house
            self.name = name
            self.position = position
            self.abs_pos = abs_pos
            self.point_type = "Planet" if house else "House"

    class FakeSubject:
        city = "Kunshan"
        nation = "CN"
        tz_str = "Asia/Shanghai"
        sun = FakePoint("Gem", "Ninth_House", position=23.87, abs_pos=83.87)
        moon = FakePoint("Pis", "Fifth_House", position=11.74, abs_pos=341.74)
        mercury = FakePoint("Can", "Ninth_House", position=1.25, abs_pos=91.25)
        venus = FakePoint("Tau", "Eighth_House", position=18.45, abs_pos=48.45)
        mars = FakePoint("Ari", "Sixth_House", position=10.84, abs_pos=10.84)
        first_house = FakePoint("Lib", name="First_House", position=14.37, abs_pos=194.37)
        tenth_house = FakePoint("Can", name="Tenth_House", position=15.38, abs_pos=105.38)
        houses_degree_ut = (
            194.37,
            222.6,
            253.25,
            285.38,
            317.51,
            347.69,
            14.37,
            42.6,
            73.25,
            105.38,
            137.51,
            167.69,
        )
        houses_list = [
            FakePoint("Lib", name="First_House", position=14.37, abs_pos=194.37),
            FakePoint("Sco", name="Second_House", position=12.6, abs_pos=222.6),
        ]

    class FakeAspects:
        all_aspects = [
            {
                "p1_name": "Sun",
                "p2_name": "Mars",
                "aspect": "quintile",
                "aspect_degrees": 72,
                "orbit": 1.02,
            }
        ]
        relevant_aspects = [
            {
                "p1_name": "Moon",
                "p2_name": "Venus",
                "aspect": "sextile",
                "aspect_degrees": 60,
                "orbit": 6.71,
            }
        ]

    def fake_build_subject(payload):
        return FakeSubject()

    def fake_build_aspects(subject):
        return FakeAspects()

    monkeypatch.setattr(app_module, "build_subject", fake_build_subject)
    monkeypatch.setattr(app_module, "build_aspects", fake_build_aspects)

    client = TestClient(app)
    response = client.post(
        "/api/v1/chart/natal",
        json={
            "subject": {
                "name": "Demo",
                "year": 1990,
                "month": 6,
                "day": 15,
                "hour": 14,
                "minute": 30,
                "city": "Kunshan",
                "nation": "CN",
                "longitude": 120.954305,
                "latitude": 31.377623,
                "timezone": "Asia/Shanghai",
            }
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "OK",
        "chart_data": {
            "subject": {
                "city": "Kunshan",
                "nation": "CN",
                "tz_str": "Asia/Shanghai",
                "iso_formatted_local_datetime": "1990-06-15T14:30:00+09:00",
                "iso_formatted_utc_datetime": "1990-06-15T05:30:00Z",
                "sun": {"sign": "Gem", "house": "Ninth_House", "position": 23.87, "abs_pos": 83.87},
                "moon": {"sign": "Pis", "house": "Fifth_House", "position": 11.74, "abs_pos": 341.74},
                "mercury": {"sign": "Can", "house": "Ninth_House", "position": 1.25, "abs_pos": 91.25},
                "venus": {"sign": "Tau", "house": "Eighth_House", "position": 18.45, "abs_pos": 48.45},
                "mars": {"sign": "Ari", "house": "Sixth_House", "position": 10.84, "abs_pos": 10.84},
                "ascendant": {"sign": "Lib", "house": "First_House", "position": 14.37, "abs_pos": 194.37},
                "medium_coeli": {"sign": "Can", "house": "Tenth_House", "position": 15.38, "abs_pos": 105.38},
            },
            "houses": {
                "cusps": [194.37, 222.6, 253.25, 285.38, 317.51, 347.69, 14.37, 42.6, 73.25, 105.38, 137.51, 167.69],
                "list": [
                    {"sign": "Lib", "house": "First_House", "position": 14.37, "abs_pos": 194.37},
                    {"sign": "Sco", "house": "Second_House", "position": 12.6, "abs_pos": 222.6},
                ],
            },
            "aspects": {
                "all": [
                    {
                        "p1_name": "Sun",
                        "p2_name": "Mars",
                        "aspect": "quintile",
                        "aspect_degrees": 72,
                        "orbit": 1.02,
                    }
                ],
                "relevant": [
                    {
                        "p1_name": "Moon",
                        "p2_name": "Venus",
                        "aspect": "sextile",
                        "aspect_degrees": 60,
                        "orbit": 6.71,
                    }
                ],
            },
        },
    }
