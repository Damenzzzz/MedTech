# КазМедСим

Клинический образовательный симулятор для студентов, интернов и ординаторов. Проект использует только синтетические случаи и не предназначен для диагностики реальных пациентов.

## Локальный запуск

Требования: Node.js 20.9+ и pnpm 10+.

```bash
pnpm install
pnpm dev
```

Откройте `http://localhost:3000` — приложение перенаправит на русскую локаль. Demo-профиль и прогресс хранятся только в браузере.

## Проверки

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## Архитектура данных и RAG

- `src/domain/schemas.ts` — Zod-контракты медицинских данных и сессии.
- `src/repositories/case-repository.ts` — интерфейс repository и factory.
- `src/repositories/seed-case-repository.server.ts` — готовый локальный источник.
- `src/repositories/supabase-case-repository.server.ts` — безопасная точка расширения.
- `src/engines/patient-engine.ts` — заменяемый контракт виртуального пациента.
- `src/engines/mock-patient-engine.server.ts` — детерминированная demo-реализация.
- `src/rag/contracts.ts` — Zod-контракты будущего RAG adapter и цитат.

Полные случаи и scoring rubric находятся в server-only модулях. Клиент получает только `StudentCaseDTO`; скрытые факты и эталонный разбор выдаются лишь debrief endpoint после завершения.

## GPT-5.5 RAG service

Backend-прототип медицинского RAG-ассистента лежит в `rag_service/`. Он использует адаптированный Askhat RAG pipeline, официальный корпус протоколов РК, faithfulness-фильтры для фактов пациента и GPT-5.5 как основной LLM.

```bash
cd rag_service
cp .env.example .env
# заполните OPENAI_API_KEY и ключ embeddings/rerank provider при необходимости
./scripts/run_askhat_rag.sh
```

Локальный demo UI будет доступен на `http://127.0.0.1:8080`. Большие PDF, FAISS/BM25 индексы и сгенерированные corpus jsonl не хранятся в git; их нужно пересобрать локально скриптами из `rag_service/scripts/`.

## Vercel

Custom server не используется. Route Handlers и App Router совместимы с Vercel. Переменные окружения для demo не нужны. Для будущего backend предусмотрены `CASE_REPOSITORY=supabase`, `NEXT_PUBLIC_SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY`; значения проверяются через Zod и не должны попадать в репозиторий.
