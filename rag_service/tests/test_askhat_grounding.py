import os
import asyncio
import unittest
from unittest.mock import patch

from askhat_rag import postprocessor
from askhat_rag.data_loader import Protocol, extract_icd_codes, extract_icd_labels
from askhat_rag.indexer import Chunk
from askhat_rag.retriever import promote_strategy_coverage, select_top_chunks
from askhat_rag.generator import _preferred_codes_for_chunk
import askhat_rag.server as rag_server
from askhat_rag.server import _source_items, _stabilize_refined_assessment


class TestAskhatGrounding(unittest.TestCase):
    def test_public_source_contains_viewer_metadata_and_full_chunk(self):
        protocol = Protocol(
            protocol_id="p_hellp",
            source_file="HELLP-СИНДРОМ.pdf",
            title="HELLP СИНДРОМ",
            icd_codes=["O14.2"],
            text="Полный текст протокола с диагностическими критериями.",
        )
        previous = rag_server._protocols
        rag_server._protocols = {protocol.protocol_id: protocol}
        try:
            source = _source_items([Chunk(
                chunk_id="p_hellp_diagnostic",
                protocol_id=protocol.protocol_id,
                protocol_title="Одобрен",
                icd_codes=protocol.icd_codes,
                section_type="diagnostic_criteria",
                text="Точный текст процитированного фрагмента.",
            )])[0]
            self.assertEqual(source.title, "HELLP СИНДРОМ")
            self.assertEqual(source.source_file, "HELLP-СИНДРОМ.pdf")
            self.assertEqual(source.chunk_text, "Точный текст процитированного фрагмента.")

            response = asyncio.run(rag_server.get_protocol(protocol.protocol_id))
            self.assertEqual(response.text, protocol.text)
        finally:
            rag_server._protocols = previous

    def test_strict_context_drops_globally_valid_but_unretrieved_code(self):
        with patch.dict(os.environ, {"STRICT_CONTEXT_ICD": "1"}):
            postprocessor.ALL_VALID_ICD_CODES.clear()
            postprocessor.ALL_VALID_ICD_CODES.update({"A04.6", "K35"})

            result = postprocessor.validate_icd_codes(
                [
                    {"diagnosis": "Appendicitis", "icd10_code": "K35"},
                    {"diagnosis": "Enteritis", "icd10_code": "A04.6"},
                ],
                {"A04.6"},
                {},
            )

            self.assertEqual([item["icd10_code"] for item in result], ["A04.6"])

    def test_strict_context_expands_prefix_only_inside_retrieved_codes(self):
        with patch.dict(os.environ, {"STRICT_CONTEXT_ICD": "1"}):
            postprocessor.ALL_VALID_ICD_CODES.clear()
            postprocessor.ALL_VALID_ICD_CODES.update({"A04.6", "A04.7"})

            result = postprocessor.validate_icd_codes(
                [{"diagnosis": "Enteritis", "icd10_code": "A04"}],
                {"A04.6"},
                {},
            )

            self.assertEqual([item["icd10_code"] for item in result], ["A04.6"])

    def test_icd_parser_normalizes_cyrillic_ocr_variants(self):
        text = "Код по МКБ: К 22,0 Ахалазия; С 22.2 Гепатобластома; F32.1 Депрессия."

        self.assertEqual(extract_icd_codes(text), ["K22.0", "C22.2", "F32.1"])
        self.assertEqual(extract_icd_labels(text)["K22.0"], "Ахалазия")

    def test_context_selection_preserves_reranker_order(self):
        lower_priority_first = Chunk(
            chunk_id="p1_treatment",
            protocol_id="p1",
            protocol_title="First",
            icd_codes=["A00"],
            section_type="treatment",
            text="first",
        )
        diagnostic_second = Chunk(
            chunk_id="p2_diagnostic_criteria",
            protocol_id="p2",
            protocol_title="Second",
            icd_codes=["B00"],
            section_type="diagnostic_criteria",
            text="second",
        )

        selected = select_top_chunks([lower_priority_first, diagnostic_second])

        self.assertEqual([chunk.protocol_id for chunk in selected], ["p1", "p2"])

    def test_context_selection_limits_duplicate_protocol_titles(self):
        chunks = [
            Chunk(
                chunk_id=f"p{index}_part",
                protocol_id=f"p{index}",
                protocol_title="Same protocol",
                icd_codes=["A00"],
                section_type="diagnostic_criteria",
                text=str(index),
            )
            for index in range(3)
        ]

        self.assertEqual(len(select_top_chunks(chunks)), 2)

    def test_strategy_coverage_promotes_icd_candidate(self):
        chunks = [
            Chunk(str(index), str(index), str(index), [], "full_text", str(index))
            for index in range(8)
        ]

        covered = promote_strategy_coverage(chunks, [chunks[7]], [chunks[0]])

        self.assertIn(chunks[7], covered[:7])

    def test_faithfulness_filter_does_not_turn_protocol_criteria_into_patient_facts(self):
        patient_text = (
            "Беременность 34 недели. АД 170/110, сильная головная боль, "
            "нарушения зрения, боль в правом подреберье, повышены АЛТ/АСТ, "
            "тромбоцитопения."
        )

        result = postprocessor.ground_diagnoses_to_patient(
            [
                {
                    "diagnosis": "Тяжелая преэклампсия",
                    "icd10_code": "O14.1",
                    "explanation": "У пациентки есть гипертензия и протеинурия.",
                    "supporting_findings": [
                        {
                            "finding": "АД 170/110",
                            "patient_evidence": "АД 170/110",
                        },
                        {
                            "finding": "протеинурия",
                            "patient_evidence": None,
                        },
                    ],
                    "missing_findings": [],
                }
            ],
            patient_text,
        )

        self.assertEqual([item["finding"] for item in result[0]["supporting_findings"]], ["АД 170/110"])
        self.assertTrue(any("протеинурия" in item for item in result[0]["missing_findings"]))
        self.assertNotIn("протеинурия", result[0]["explanation"].split("Факты пациента:", 1)[-1].split(".", 1)[0])

    def test_faithfulness_filter_drops_broad_duplicate_after_specific_code(self):
        result = postprocessor.ground_diagnoses_to_patient(
            [
                {
                    "diagnosis": "Тяжелая преэклампсия",
                    "icd10_code": "O14.1",
                    "supporting_findings": [{"finding": "АД 170/110", "patient_evidence": "АД 170/110"}],
                },
                {
                    "diagnosis": "Преэклампсия",
                    "icd10_code": "O14",
                    "supporting_findings": [{"finding": "АД 170/110", "patient_evidence": "АД 170/110"}],
                },
            ],
            "АД 170/110",
        )

        self.assertEqual([item["icd10_code"] for item in result], ["O14.1"])

    def test_malformed_json_parser_recovers_diagnosis_code_pairs(self):
        raw = '{"diagnoses":[{"diagnosis":"Синдром HELLP","icd10_code":"O14.2","confidence":"high",'

        self.assertEqual(
            postprocessor.parse_diagnosis_json(raw),
            [{"diagnosis": "Синдром HELLP", "icd10_code": "O14.2", "confidence": "high"}],
        )

    def test_hellp_fallback_prefers_specific_obstetric_code(self):
        chunk = Chunk(
            chunk_id="hellp",
            protocol_id="hellp",
            protocol_title="HELLP-СИНДРОМ",
            icd_codes=["O99", "O14.2", "B15", "B30"],
            section_type="diagnostic_criteria",
            text="HELLP",
        )

        self.assertEqual(_preferred_codes_for_chunk(chunk), ["O14.2"])

    def test_obstetric_unknowns_are_not_shown_as_support_when_absent(self):
        patient_text = "Беременная 34 недели. АД 170/110, головная боль, повышение АЛТ/АСТ."
        result = postprocessor.ground_diagnoses_to_patient(
            [
                {
                    "diagnosis": "Синдром HELLP",
                    "icd10_code": "O14.2",
                    "supporting_findings": [],
                    "missing_findings": [],
                },
                {
                    "diagnosis": "Гестационная гипертензия",
                    "icd10_code": "O13",
                    "supporting_findings": [],
                    "missing_findings": [],
                },
            ],
            patient_text,
        )

        self.assertEqual([item["icd10_code"] for item in result], ["O14.2", "O13"])
        support_text = " ".join(item["finding"].lower() for item in result[0]["supporting_findings"])
        missing_text = " ".join(result[0]["missing_findings"]).lower()
        self.assertNotIn("протеинур", support_text)
        self.assertNotIn("гемолиз", support_text)
        self.assertIn("протеинур", missing_text)
        self.assertIn("гемолиз", missing_text)
        self.assertTrue(result[0]["why_this_diagnosis"])

    def test_severe_preeclampsia_ranks_before_hellp_without_hemolysis(self):
        result = postprocessor.ground_diagnoses_to_patient(
            [
                {
                    "diagnosis": "Синдром HELLP",
                    "icd10_code": "O14.2",
                    "confidence": "high",
                    "supporting_findings": [],
                    "missing_findings": [],
                },
                {
                    "diagnosis": "Тяжелая преэклампсия",
                    "icd10_code": "O14.1",
                    "confidence": "medium",
                    "supporting_findings": [],
                    "missing_findings": [],
                },
            ],
            "Беременная 34 недели. АД 170/110, головная боль, тромбоцитопения.",
        )

        self.assertEqual([item["icd10_code"] for item in result], ["O14.1", "O14.2"])
        self.assertEqual(result[1]["confidence"], "medium")

    def test_hellp_ranks_before_preeclampsia_when_hemolysis_is_confirmed(self):
        result = postprocessor.ground_diagnoses_to_patient(
            [
                {
                    "diagnosis": "Тяжелая преэклампсия",
                    "icd10_code": "O14.1",
                    "confidence": "high",
                    "supporting_findings": [],
                    "missing_findings": [],
                },
                {
                    "diagnosis": "HELLP-синдром",
                    "icd10_code": "O14.2",
                    "confidence": "medium",
                    "supporting_findings": [],
                    "missing_findings": [],
                },
            ],
            "Беременная 34 недели. АД 170/110, АЛТ/АСТ повышены, тромбоцитопения, шистоциты, гемолиз подтвержден, билирубин повышен.",
        )

        self.assertEqual([item["icd10_code"] for item in result], ["O14.2", "O14.1"])
        self.assertEqual(result[0]["confidence"], "high")

    def test_short_why_is_generated_from_grounded_facts(self):
        result = postprocessor.ground_diagnoses_to_patient(
            [
                {
                    "diagnosis": "Тяжелая преэклампсия",
                    "icd10_code": "O14.1",
                    "supporting_findings": [{"finding": "АД 170/110", "patient_evidence": "АД 170/110"}],
                    "missing_findings": ["Протеинурия не указана"],
                }
            ],
            "АД 170/110",
        )

        self.assertIn("АД 170/110", result[0]["why_this_diagnosis"])
        self.assertIn("Протеинурия не указана", result[0]["why_this_diagnosis"])

    def test_hellp_support_prioritizes_liver_platelets_and_ruq_pain(self):
        result = postprocessor.ground_diagnoses_to_patient(
            [
                {
                    "diagnosis": "HELLP-синдром",
                    "icd10_code": "O14.2",
                    "supporting_findings": [],
                    "missing_findings": [],
                }
            ],
            (
                "Беременная женщина, 34 неделя беременности. Сильная головная боль, "
                "мелькание мушек перед глазами, боль в правом подреберье и выраженные отеки ног. "
                "Артериальное давление 170/110 мм рт. ст. В анализах повышение АЛТ и АСТ, "
                "снижение количества тромбоцитов."
            ),
        )

        facts = [item["finding"].lower() for item in result[0]["supporting_findings"][:4]]
        joined = " ".join(facts)
        self.assertTrue("алт" in joined or "аст" in joined)
        self.assertIn("тромбоцит", joined)
        self.assertIn("правом подреберье", joined)

    def test_refine_preserves_previous_rag_candidates_on_noisy_input(self):
        previous = {
            "diagnoses": [
                {"rank": 1, "diagnosis": "Тяжелая преэклампсия", "icd10_code": "O14.1", "explanation": ""},
                {"rank": 2, "diagnosis": "HELLP-синдром", "icd10_code": "O14.2", "explanation": ""},
            ],
            "follow_up_questions": [{"question": "Есть ли протеинурия?"}],
        }

        stabilized = _stabilize_refined_assessment(previous, {"diagnoses": [], "follow_up_questions": []})

        self.assertEqual([item["icd10_code"] for item in stabilized["diagnoses"]], ["O14.1", "O14.2"])

    def test_refine_appends_lost_previous_candidate_after_rerank(self):
        previous = {
            "diagnoses": [
                {"rank": 1, "diagnosis": "Тяжелая преэклампсия", "icd10_code": "O14.1", "explanation": ""},
                {"rank": 2, "diagnosis": "HELLP-синдром", "icd10_code": "O14.2", "explanation": ""},
            ],
            "follow_up_questions": [],
        }
        refined = {
            "diagnoses": [
                {"rank": 1, "diagnosis": "HELLP-синдром", "icd10_code": "O14.2", "explanation": ""},
            ],
            "follow_up_questions": [],
        }

        stabilized = _stabilize_refined_assessment(previous, refined)

        self.assertEqual([item["icd10_code"] for item in stabilized["diagnoses"]], ["O14.2", "O14.1"])
        self.assertIn("Сохранено из первичного RAG-кандидата", stabilized["diagnoses"][1]["missing_findings"][0])


if __name__ == "__main__":
    unittest.main()
