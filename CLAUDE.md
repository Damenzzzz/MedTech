\## Context7 documentation policy



Use Context7 before implementing or changing code that depends on external

libraries, frameworks, SDKs, APIs or version-specific behavior.



Rules:



\- Prefer Context7 CLI + Skill instead of generic web search.

\- Request only documentation relevant to the current file and task.

\- Include the exact library and installed version when known.

\- Do not load an entire library's documentation.

\- Do not repeat the same Context7 request if the relevant documentation

&#x20; is already available in the current session.

\- For this project, especially use Context7 for:

&#x20; Next.js, React, next-intl, Zustand, Zod, Playwright, OpenAI STT,

&#x20; FastAPI and Pydantic.

