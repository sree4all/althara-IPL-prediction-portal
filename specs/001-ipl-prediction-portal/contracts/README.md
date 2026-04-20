# API & integration contracts

Contracts describe **behavioral interfaces** for the MVP. Implementation may use Next.js Route Handlers (`/api/...`) or Supabase RPC (`rpc/...`); both must honor the same payloads and errors.

| Document | Description |
|----------|-------------|
| [predictions-upsert.md](./predictions-upsert.md) | Save or revise a prediction with server-enforced UTC lock. |
| [matches-list.md](./matches-list.md) | List matches with client lock/eligibility hints (authoritative lock still server-side). |
