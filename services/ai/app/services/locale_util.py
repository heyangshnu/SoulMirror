"""App locale from API (Accept-Language → body.locale)."""


def resolve_locale(locale: str | None) -> str:
    if locale and str(locale).lower().startswith("en"):
        return "en"
    return "zh"


def is_english(locale: str | None) -> bool:
    return resolve_locale(locale) == "en"
