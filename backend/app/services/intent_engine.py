from dataclasses import dataclass
from typing import Any, Dict, List

from app.services.recipes import RECIPES


@dataclass
class IntentResult:
    detected_recipe: str
    requirements: Dict[str, Any]
    questions: List[str]


class IntentEngine:
    def analyze(self, intent_text: str, language: str = "en") -> IntentResult:
        intent_lower = intent_text.lower()
        detected_recipe = self._detect_recipe(intent_lower)
        recipe = RECIPES.get(detected_recipe, RECIPES["unknown"])
        requirements = dict(recipe["requirements"])
        requirements["intent_language"] = language
        requirements["clarification_questions"] = recipe["questions"]
        return IntentResult(
            detected_recipe=detected_recipe,
            requirements=requirements,
            questions=recipe["questions"],
        )

    def _detect_recipe(self, intent_lower: str) -> str:
        for recipe_name, recipe in RECIPES.items():
            if recipe_name == "unknown":
                continue
            if any(keyword in intent_lower for keyword in recipe["keywords"]):
                return recipe_name
        return "unknown"
