"""Pydantic request/response models."""
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

UTCDatetime = Annotated[datetime, PlainSerializer(lambda d: d.isoformat() + "Z", return_type=str)]

QuestionType = Literal[
    "short_text", "long_text", "multiple_choice", "dropdown", "email", "number", "yes_no", "rating", "file_upload"
]
RuleOp = Literal["equals", "not_equals", "contains", "greater_than", "less_than"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ChoiceIn(BaseModel):
    label: str = Field(max_length=300)


class ChoiceOut(ORM):
    id: int
    label: str


class RuleIn(BaseModel):
    op: RuleOp = "equals"
    value: str = Field(default="", max_length=300)
    action: Literal["jump", "end"] = "jump"
    target_question_id: int | None = None


class RuleOut(ORM, RuleIn):
    id: int


class QuestionCreate(BaseModel):
    type: QuestionType
    index: int | None = None  # insert position; default = append


class QuestionPatch(BaseModel):
    type: QuestionType | None = None
    title: str | None = Field(default=None, max_length=1000)
    description: str | None = Field(default=None, max_length=2000)
    required: bool | None = None
    settings: dict[str, Any] | None = None
    choices: list[ChoiceIn] | None = None
    rules: list[RuleIn] | None = None


class QuestionOut(ORM):
    id: int
    form_id: int
    position: int
    type: QuestionType
    title: str
    description: str
    required: bool
    settings: dict[str, Any]
    choices: list[ChoiceOut]
    rules: list[RuleOut]


class FormCreate(BaseModel):
    title: str = Field(default="My new form", max_length=200)


class FormPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    theme: dict[str, Any] | None = None
    settings: dict[str, Any] | None = None
    welcome_enabled: bool | None = None
    welcome_title: str | None = Field(default=None, max_length=300)
    welcome_description: str | None = Field(default=None, max_length=2000)
    welcome_button: str | None = Field(default=None, max_length=60)
    thankyou_title: str | None = Field(default=None, max_length=300)
    thankyou_description: str | None = Field(default=None, max_length=2000)


class FormOut(ORM):
    id: int
    title: str
    slug: str
    status: str
    theme: dict[str, Any]
    settings: dict[str, Any] = {}
    welcome_enabled: bool
    welcome_title: str
    welcome_description: str
    welcome_button: str
    thankyou_title: str
    thankyou_description: str
    created_at: UTCDatetime
    updated_at: UTCDatetime
    published_at: UTCDatetime | None
    questions: list[QuestionOut]


class FormListItem(BaseModel):
    id: int
    title: str
    slug: str
    status: str
    question_count: int
    response_count: int
    started_count: int = 0
    theme: dict[str, Any]
    updated_at: UTCDatetime


class ReorderIn(BaseModel):
    question_ids: list[int]


class AnswersIn(BaseModel):
    answers: dict[int, Any]


class ResponseOut(BaseModel):
    id: int
    status: str
    started_at: UTCDatetime
    submitted_at: UTCDatetime | None
    answers: dict[int, Any]


class ResponsePage(BaseModel):
    total: int
    items: list[ResponseOut]
