<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ yarn install
```

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Warnings

Warnings are computed exclusively on the backend and rendered from `warning_rules` templates.
Rules are applied only when they exist and are both `enabled` and `isActive`.

**Endpoints**

- `POST /v1/plantings` and `PATCH /v1/plantings/:id` always return computed warnings and harvest window.
- `GET /v1/plantings` and `GET /v1/plantings/:id` accept `includeWarnings=true` to compute warnings (harvest window is always returned).

**Placeholders by code**

- `DEPTH_TOO_SMALL`: `vegetableName`, `bedName`, `bedDepthCm`, `requiredDepthCm`
- `SOIL_NOT_RECOMMENDED`: `vegetableName`, `bedName`
- `PH_OUT_OF_RANGE`: `vegetableName`, `bedName`, `measuredPh`, `recommendedPhMin`, `recommendedPhMax`, `direction`, `directionText`, `phThreshold`, `phDelta`
- `NPK_TOO_LOW`: `vegetableName`, `bedName`, `nutrient`, `needLevel`, `measuredLevel`, `deficit`
- `FAMILY_REPETITION`: `vegetableName`, `bedName`, `familyName`
- `ROTATION_RISK`: `vegetableName`, `bedName`, `rotationGroup`
- `WATER_RETENTION_MISMATCH`: `vegetableName`, `bedName`, `soilWaterRetention`, `vegetableWaterDemand`
- `DRAINAGE_MISMATCH`: **not emitted yet** (TODO: requires vegetable drainage preference)
- `HARVEST_WINDOW_MISSED`: `vegetableName`, `bedName`, `harvestEndDate` (ISO)
- `SUBOPTIMAL_SOWING_TIME`: `vegetableName`, `bedName`, `plannedStartDate` (ISO), `sowingStartMonth`, `sowingEndMonth`
- `EXPERIMENTAL_SETUP`: `vegetableName`, `bedName`

## GEO proxy + location (backend)

Nowe endpointy GEO:

- `GET /v1/geo/search?q=...&limit=6&lang=pl|en`
- `GET /v1/geo/reverse?lat=...&lon=...&lang=pl|en`

Cache key i TTL:

- search: `geo:search:<lang>:<sha1(q)>:<limit>`, TTL 7 dni
- reverse: `geo:reverse:<lang>:<rounded(lat,lon)>`, TTL 30 dni
- storage: tabela `geo_cache_entries` (TTL egzekwowany w backendzie)

Rate limit dla `/v1/geo/*`:

- domyślnie `30/min` (per user, fallback per IP)
- konfigurowalne przez `GEO_RATE_LIMIT_PER_MIN`

Konfiguracja providera (Nominatim):

- `GEO_NOMINATIM_BASE_URL` (opcjonalnie, default: `https://nominatim.openstreetmap.org`)
- `GEO_PROVIDER_TIMEOUT_MS` (opcjonalnie, default: `3500`)
- `GEO_PROVIDER_USER_AGENT` (**zalecane**: nazwa aplikacji + kontakt)

Przykład `GEO_PROVIDER_USER_AGENT`:

- `Warzywnik/1.0 (+https://twoja-domena.pl; kontakt@twoja-domena.pl)`

Zapis lokalizacji użytkownika:

- `PUT /v1/users/me/location`
- emituje event domenowy `LOCATION_UPDATED`
- handler eventu ma TODO pod kolejną iterację (`WeatherSnapshot`)

## Deterministic action automation — smoke test

Assume `API=http://localhost:4000`, valid `Authorization: Bearer <TOKEN>`, and existing IDs:

- `VEGETABLE_ID`, `BED_ID`, `PLANTING_ID`, `TEMPLATE_PLANTING_ID`, `TEMPLATE_BED_ID`, `TASK_ID`.

1. Update vegetable rules (replace list, recurring + timeline triggers)

```bash
curl -X PATCH "$API/v1/vegetables/$VEGETABLE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actionRules": [
      {
        "actionTemplateId": "'$TEMPLATE_PLANTING_ID'",
        "trigger": "AFTER_SOWING_DAYS",
        "offsetDays": 2,
        "schedule": "EVERY_N_DAYS",
        "everyNDays": 7,
        "occurrencesLimit": 4,
        "applyIfStartMethod": ["DIRECT_SOW"],
        "isEnabled": true
      },
      {
        "actionTemplateId": "'$TEMPLATE_BED_ID'",
        "trigger": "ON_HARVEST_CONFIRMED",
        "offsetDays": 0,
        "schedule": "ONCE",
        "isEnabled": true
      }
    ]
  }'
```

2. Create planting with timeline fields → automatic recompute

```bash
curl -X POST "$API/v1/plantings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bedId": "'$BED_ID'",
    "vegetableId": "'$VEGETABLE_ID'",
    "plannedStartDate": "2026-02-20T09:00:00.000Z",
    "startMethod": "DIRECT_SOW",
    "sowedAt": "2026-02-20T09:00:00.000Z",
    "harvestWindowStart": "2026-05-10T09:00:00.000Z",
    "harvestWindowEnd": "2026-05-25T09:00:00.000Z",
    "timelineTimezone": "Europe/Warsaw"
  }'
```

3. Manual recompute (optional latest rules + override manual reschedules)

```bash
curl -X POST "$API/v1/plantings/$PLANTING_ID/recompute-actions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"useLatestRules":true,"forceOverrideManual":false}'
```

4. Reschedule task manually (sets manual override flag)

```bash
curl -X PATCH "$API/v1/action-tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dueAt":"2026-03-01T09:00:00.000Z"}'
```

5. Harvest confirmation YES → returns `proposals` (no auto-create)

```bash
curl -X POST "$API/v1/plantings/$PLANTING_ID/harvest-confirmation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"answer":"yes"}'
```

6. Create selected tasks from modal (bulk) → reminders created

```bash
curl -X POST "$API/v1/beds/$BED_ID/action-tasks/bulk" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "actionTemplateId": "'$TEMPLATE_BED_ID'" }
    ]
  }'
```

7. Calendar view (tasks + harvest windows + reminders)

```bash
curl "$API/v1/calendar?from=2026-02-01&to=2026-06-30&includeDoneTasks=true&includeReminders=true" \
  -H "Authorization: Bearer $TOKEN"
```

8. Mark task DONE → pending reminder canceled

```bash
curl -X PATCH "$API/v1/action-tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
