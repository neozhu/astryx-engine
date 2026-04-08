from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict
from kerykeion import AstrologicalSubject, NatalAspects


class NatalSubjectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    year: int
    month: int
    day: int
    hour: int
    minute: int
    city: str
    nation: str
    longitude: float
    latitude: float
    timezone: str


class NatalChartRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: NatalSubjectRequest


NatalSubjectRequest.model_rebuild()
NatalChartRequest.model_rebuild()


app = FastAPI(title="Astryx Kerykeion API")


def build_subject(payload: NatalSubjectRequest):
    return AstrologicalSubject(
        name=payload.name,
        year=payload.year,
        month=payload.month,
        day=payload.day,
        hour=payload.hour,
        minute=payload.minute,
        city=payload.city,
        nation=payload.nation,
        lng=payload.longitude,
        lat=payload.latitude,
        tz_str=payload.timezone,
        online=False,
    )


def build_aspects(subject: AstrologicalSubject):
    return NatalAspects(subject)


def build_iso_datetimes(payload: NatalSubjectRequest):
    local_datetime = datetime(
        payload.year,
        payload.month,
        payload.day,
        payload.hour,
        payload.minute,
        tzinfo=ZoneInfo(payload.timezone),
    )
    utc_datetime = local_datetime.astimezone(ZoneInfo("UTC"))

    return (
        local_datetime.isoformat(),
        utc_datetime.replace(tzinfo=None).isoformat() + "Z",
    )


def to_point_summary(point: object | None, fallback_house: str | None = None):
    if not point:
        return {}

    if isinstance(point, dict):
        data = point
    elif hasattr(point, "model_dump"):
        data = point.model_dump()
    else:
        data = {
            "sign": getattr(point, "sign", None),
            "house": getattr(point, "house", None),
            "name": getattr(point, "name", None),
            "position": getattr(point, "position", None),
            "abs_pos": getattr(point, "abs_pos", None),
        }

    return {
        "sign": data.get("sign"),
        "house": data.get("house") or data.get("name") or fallback_house,
        "position": data.get("position"),
        "abs_pos": data.get("abs_pos"),
    }


def to_house_list(subject: AstrologicalSubject):
    houses = getattr(subject, "houses_list", None) or []
    return [to_point_summary(house) for house in houses]


def to_house_cusps(subject: AstrologicalSubject):
    cusps = getattr(subject, "houses_degree_ut", None) or ()
    return list(cusps)


def to_aspect_list(value: object | None):
    if not value:
        return []

    if isinstance(value, list):
        return value

    return list(value)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/v1/chart/natal")
def natal_chart(request: NatalChartRequest):
    subject = build_subject(request.subject)
    aspects = build_aspects(subject)
    local_datetime, utc_datetime = build_iso_datetimes(request.subject)

    return {
        "status": "OK",
        "chart_data": {
            "subject": {
                "city": request.subject.city,
                "nation": request.subject.nation,
                "tz_str": request.subject.timezone,
                "iso_formatted_local_datetime": local_datetime,
                "iso_formatted_utc_datetime": utc_datetime,
                "sun": to_point_summary(getattr(subject, "sun", None)),
                "moon": to_point_summary(getattr(subject, "moon", None)),
                "mercury": to_point_summary(getattr(subject, "mercury", None)),
                "venus": to_point_summary(getattr(subject, "venus", None)),
                "mars": to_point_summary(getattr(subject, "mars", None)),
                "ascendant": to_point_summary(
                    getattr(subject, "first_house", None),
                    "First_House",
                ),
                "medium_coeli": to_point_summary(
                    getattr(subject, "tenth_house", None),
                    "Tenth_House",
                ),
            },
            "houses": {
                "cusps": to_house_cusps(subject),
                "list": to_house_list(subject),
            },
            "aspects": {
                "all": to_aspect_list(getattr(aspects, "all_aspects", None)),
                "relevant": to_aspect_list(
                    getattr(aspects, "relevant_aspects", None),
                ),
            },
        },
    }


@app.post("/api/v5/chart-data/birth-chart")
def natal_chart_v5(request: NatalChartRequest):
    return natal_chart(request)
