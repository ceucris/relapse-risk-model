from __future__ import annotations

from recovery.domain.enums import InterventionType, RiskLevel


# Lightweight, evidence-inspired scripts. Not clinical treatment protocols.
INTERVENTION_SCRIPTS: dict[InterventionType, list[str]] = {
    InterventionType.URGE_SURFING: [
        "I'm here with you. Cravings often rise and fall like a wave — we can ride this one together.",
        "Notice where you feel the urge in your body. You don't have to fight it or act on it.",
        "Breathe in for 4, hold for 4, out for 6. We'll stay with the wave until it peaks and softens.",
        "What intensity is the craving now, from 0 to 10?",
    ],
    InterventionType.COGNITIVE_REFRAME: [
        "That thought might feel true right now — let's slow it down and look at it together.",
        "What's the urge telling you will happen if you give in? What's another possible outcome?",
        "Can we name one value or goal that matters more than this moment's relief?",
        "How strong is the craving now, 0–10, after sitting with that?",
    ],
    InterventionType.GROUNDING: [
        "Let's get you back into the present. Look around and name 5 things you can see.",
        "Now 4 things you can touch, 3 you can hear, 2 you can smell, 1 you can taste.",
        "You're here, and this moment is survivable. How intense is the urge now, 0–10?",
    ],
    InterventionType.VALUES_REMINDER: [
        "You've been building something real. Want me to remind you why you started?",
        "Who benefits when you get through this window without using?",
        "One small protective action right now beats a perfect plan later. What's one thing you can do in the next 10 minutes?",
    ],
    InterventionType.SAFETY_PLAN: [
        "I'm concerned about how hard this feels. Let's use your safety plan.",
        "Are you in a safe place right now? Can you remove or leave any immediate triggers?",
        "I can connect you with your counselor. Would you like that, or should we keep working through this together?",
    ],
}


class InterventionEngine:
    """Selects and steps through a conversational intervention."""

    def select(
        self,
        risk_level: RiskLevel,
        craving: float | None,
        distress: float,
    ) -> InterventionType:
        if distress >= 0.8 or risk_level == RiskLevel.CRITICAL:
            return InterventionType.SAFETY_PLAN
        if craving is not None and craving >= 0.7:
            return InterventionType.URGE_SURFING
        if distress >= 0.55:
            return InterventionType.GROUNDING
        if risk_level == RiskLevel.HIGH:
            return InterventionType.COGNITIVE_REFRAME
        return InterventionType.VALUES_REMINDER

    def opening(self, intervention: InterventionType) -> str:
        return INTERVENTION_SCRIPTS[intervention][0]

    def next_prompt(
        self, intervention: InterventionType, step: int
    ) -> str | None:
        script = INTERVENTION_SCRIPTS[intervention]
        if step >= len(script):
            return None
        return script[step]

    def steps(self, intervention: InterventionType) -> int:
        return len(INTERVENTION_SCRIPTS[intervention])
