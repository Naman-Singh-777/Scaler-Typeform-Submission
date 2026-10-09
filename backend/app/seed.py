"""Seed a default creator, two published forms (with responses) and one draft."""
import random
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .deps import DEFAULT_CREATOR_EMAIL, new_slug
from .logic import clean_settings
from .models import Answer, Choice, CustomerStory, Form, IntegrationApp, LogicRule, Question, Response, User, utcnow

CLASSIC = {"preset": "classic", "background": "#FFFFFF", "text": "#262627", "answer": "#0445AF",
           "button": "#0445AF", "buttonText": "#FFFFFF", "font": "Karla"}
SUNRISE = {"preset": "sunrise", "background": "#FFF4E6", "text": "#3D2B1F", "answer": "#D9480F",
           "button": "#D9480F", "buttonText": "#FFFFFF", "font": "Playfair Display"}
NIGHT = {"preset": "night", "background": "#161616", "text": "#FFFFFF", "answer": "#8CB8FF",
         "button": "#8CB8FF", "buttonText": "#0B1E3F", "font": "Space Grotesk"}

NAMES = ["Aarav Mehta", "Priya Sharma", "Liam Carter", "Sofia Rossi", "Noah Kim", "Emma Wilson", "Rohan Gupta",
         "Isabella Cruz", "Ethan Brown", "Ananya Singh", "Lucas Martin", "Mia Johnson", "Kabir Verma", "Olivia Davis",
         "Arjun Nair", "Chloe Taylor", "Diego Alvarez", "Zara Khan", "Jack Thompson", "Meera Iyer"]
FEEDBACK = ["Support was quick and friendly.", "The reports could load faster.", "Love the clean interface!",
            "Would like more integrations.", "Onboarding was a bit confusing.", "Great value for the price.",
            "Mobile app needs dark mode.", "Everything works well, thank you."]


def _q(form, pos, qtype, title, *, description="", required=False, choices=None, **settings) -> Question:
    q = Question(form=form, position=pos, type=qtype, title=title, description=description, required=required,
                 settings=clean_settings(qtype, settings))
    q.choices = [Choice(position=i, label=c) for i, c in enumerate(choices or [])]
    return q


def _fill(db, form, rng, completed, partial, answer_fn):
    now = utcnow()
    form.views = int((completed + partial) * 1.8)
    for i in range(completed + partial):
        done = i < completed
        started = now - timedelta(days=rng.randint(0, 13), hours=rng.randint(0, 23), minutes=rng.randint(0, 59))
        r = Response(form_id=form.id, started_at=started, status="completed" if done else "partial",
                     submitted_at=started + timedelta(seconds=rng.randint(35, 240)) if done else None)
        if done:
            r.answers = [Answer(question_id=qid, value=v) for qid, v in answer_fn(i).items()]
        db.add(r)


def seed_if_empty(db: Session) -> None:
    if db.scalar(select(Form.id).limit(1)):
        return
    rng = random.Random(7)
    user = db.scalar(select(User).where(User.email == DEFAULT_CREATOR_EMAIL)) or User(name="Demo Creator", email=DEFAULT_CREATOR_EMAIL)
    db.add(user)

    # ---- 1. Customer satisfaction survey (published, with branching) ----
    f1 = Form(owner=user, title="Customer Satisfaction Survey", slug=new_slug(db), status="published",
              theme=CLASSIC, published_at=utcnow(), welcome_enabled=True, welcome_title="Help us get better",
              welcome_description="This takes about 1 minute.", welcome_button="Start",
              thankyou_title="Thank you for your feedback!", thankyou_description="It helps us build a better product.")
    qs = [
        _q(f1, 0, "short_text", "Hello! What's your name?", required=True, placeholder="Type your name here..."),
        _q(f1, 1, "email", "And your email address?", description="We'll only use it to follow up on your feedback.", required=True),
        _q(f1, 2, "rating", "How would you rate your overall experience?", required=True, steps=5),
        _q(f1, 3, "multiple_choice", "Which features do you use the most?", description="Choose as many as you like.",
           allow_multiple=True, choices=["Dashboard", "Reports", "Integrations", "Mobile app"]),
        _q(f1, 4, "yes_no", "Would you recommend us to a friend?", required=True),
        _q(f1, 5, "long_text", "Sorry to hear that. What could we do better?", description="Only shown if you answered No."),
        _q(f1, 6, "dropdown", "How did you hear about us?", choices=["Search engine", "Friend or colleague", "Social media", "Conference", "Other"]),
        _q(f1, 7, "number", "How many people are on your team?", min=1, max=10000),
    ]
    db.add(f1)
    db.flush()
    db.add(LogicRule(question_id=qs[4].id, position=0, op="equals", value="yes", action="jump", target_question_id=qs[6].id))
    rated = [5, 5, 4, 4, 4, 3, 5, 2, 4, 5]

    def a1(i):
        rec = rng.random() > 0.3
        a = {qs[0].id: NAMES[i % len(NAMES)], qs[1].id: NAMES[i % len(NAMES)].lower().replace(" ", ".") + "@example.com",
             qs[2].id: rated[i % len(rated)], qs[4].id: rec,
             qs[3].id: rng.sample(["Dashboard", "Reports", "Integrations", "Mobile app"], rng.randint(1, 3)),
             qs[6].id: rng.choice(["Search engine", "Friend or colleague", "Social media", "Conference", "Other"]),
             qs[7].id: rng.choice([2, 5, 8, 12, 25, 40, 100])}
        if not rec:
            a[qs[5].id] = rng.choice(FEEDBACK)
        return a

    _fill(db, f1, rng, 28, 7, a1)

    # ---- 2. Event registration (published) ----
    f2 = Form(owner=user, title="DevSummit 2026 — Event Registration", slug=new_slug(db), status="published",
              theme=SUNRISE, published_at=utcnow(), thankyou_title="You're registered! 🎉",
              thankyou_description="We'll email your ticket shortly. See you there!")
    e = [
        _q(f2, 0, "short_text", "What's your full name?", required=True),
        _q(f2, 1, "email", "What's your email?", required=True),
        _q(f2, 2, "dropdown", "Which ticket would you like?", required=True, choices=["General — $99", "Workshop pass — $199", "VIP — $349"]),
        _q(f2, 3, "multiple_choice", "T-shirt size", required=True, choices=["S", "M", "L", "XL"]),
        _q(f2, 4, "yes_no", "Will you join the networking dinner?"),
        _q(f2, 5, "long_text", "Any dietary requirements or accessibility needs?"),
    ]
    db.add(f2)
    db.flush()

    def a2(i):
        a = {e[0].id: NAMES[(i * 3) % len(NAMES)], e[1].id: f"attendee{i}@example.com",
             e[2].id: rng.choice(["General — $99", "Workshop pass — $199", "VIP — $349"]),
             e[3].id: rng.choice(["S", "M", "M", "L", "XL"]), e[4].id: rng.random() > 0.4}
        if rng.random() > 0.6:
            a[e[5].id] = rng.choice(["Vegetarian", "No peanuts please", "Wheelchair access", "Vegan"])
        return a

    _fill(db, f2, rng, 14, 4, a2)

    # ---- 3. Draft ----
    f3 = Form(owner=user, title="Product Feedback (draft)", slug=new_slug(db), status="draft", theme=NIGHT)
    _q(f3, 0, "multiple_choice", "What should we build next?", choices=["Dark mode", "API access", "Templates"])
    _q(f3, 1, "rating", "How easy is the product to use?", steps=7)
    _q(f3, 2, "long_text", "Anything else you'd like to tell us?")
    db.add(f3)
    db.commit()


STORIES = [
    ("SmartBug Media", "SmartBug Media increased sales leads by 40% with one form", "/landing/cust-smartbug.png"),
    ("Double Denim Marketing", "Double Denim Marketing drove $3.67 million in sales", "/landing/cust-dd.png"),
    ("Viva", "Viva scaled talent acquisition and cut time to hire by 75%", "/landing/cust-viva.png"),
]
INTEGRATIONS = [("ActiveCampaign", "activecampaign"), ("Calendly", "calendly"), ("CallRail", "callrail"), ("Intercom", "intercom"),
                ("Klaviyo", "klaviyo"), ("Slack", "slack"), ("Stripe", "stripe"), ("Webflow", "webflow"), ("Zapier", "zapier")]


def seed_site_content(db: Session) -> None:
    """Landing-page content (testimonials + integrations marquee). Idempotent."""
    if not db.scalar(select(CustomerStory.id).limit(1)):
        db.add_all(CustomerStory(position=i, company=c, quote=q, logo=l) for i, (c, q, l) in enumerate(STORIES))
    if not db.scalar(select(IntegrationApp.id).limit(1)):
        db.add_all(IntegrationApp(position=i, name=n, logo=f"/landing/int-{k}.svg") for i, (n, k) in enumerate(INTEGRATIONS))
    db.commit()
