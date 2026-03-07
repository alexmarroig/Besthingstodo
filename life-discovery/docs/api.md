# API Documentation

Base URL: `http://localhost:8000`

## Core Routes
- `POST /users`
- `GET /users/{user_id}`
- `POST /profile`
- `GET /profile/{user_id}`
- `GET /preferences/{user_id}`
- `GET /experiences?city=Sao Paulo`

## Recommendation Routes
- `POST /recommendations`
- `POST /feedback`

## Discovery
- `POST /discovery/run`

## Concierge
- `POST /concierge`

### Example `/concierge`
```json
{
  "user_id": "<uuid>",
  "message": "What can we do tonight in Sao Paulo?",
  "city": "Sao Paulo"
}
```
