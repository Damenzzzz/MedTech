from pathlib import Path
import json
import tempfile
import unittest

from app.rag.assistant import ClinicalRagAssistant
from app.rag.ingest import build_index

class TestClinicalRag(unittest.TestCase):
    def test_rag_returns_sources(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            corpus_dir = tmp_path / "corpus"
            corpus_dir.mkdir()
            (corpus_dir / "protocols.json").write_text(
                json.dumps(
                    [
                        {
                            "protocol_id": "test_j18",
                            "source_file": "test.pdf",
                            "title": "Пневмония",
                            "icd_codes": ["J18.9"],
                            "text": "Код МКБ-10 J18.9. Пневмония: кашель, температура, боль в груди, одышка. Диагностика включает осмотр и обследование.",
                        }
                    ],
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            index_path = tmp_path / "index.json"
            build_index(corpus_dir, index_path)
            assistant = ClinicalRagAssistant(index_path)

            analysis = assistant.analyze_case("кашель температура боль в груди одышка")

            self.assertTrue(analysis.sources)
            self.assertTrue(analysis.diagnoses)
            self.assertTrue(analysis.diagnoses[0].source_ids)

if __name__ == "__main__":
    unittest.main()
