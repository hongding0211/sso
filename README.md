# SSO

## Quick Start

```bash
yarn dev    # local dev
yarn lint   # lint check
```

# API

## POST login

POST /api/login

> Body Parameters

```json
{
  "password": "password",
  "email": "foo@bar.com",
  "phone": "130000000"
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| no |none|
|» email|body|string| no |none|
|» phone|body|string| no |none|
|» password|body|string| yes |none|

> Response Examples

> 200 Response

```json
{}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|成功|Inline|

### Responses Data Schema

## POST register

POST /api/register

> Body Parameters

```json
{
  "password": "password",
  "avatar": "http://foo/bar.png",
  "phone": "130000000",
  "email": "foo@bar.com"
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| no |none|
|» email|body|string| no |none|
|» phone|body|string| no |none|
|» password|body|string| yes |none|
|» avatar|body|string| yes |头像图片 URL|

> Response Examples

> 200 Response

```json
{}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|成功|Inline|

### Responses Data Schema

## POST validate

POST /api/validate

> Body Parameters

```json
{
  "ticket": "foobar",
  "maxAge": "7d"
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| no |none|
|» ticket|body|string| yes |none|
|» maxAge|body|string| no |默认不传为 30d|

> Response Examples

> 200 Response

```json
{}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|成功|Inline|

### Responses Data Schema

## GET userInfo

GET /api/userInfo

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|x-auth-token|cookie|string| yes |none|

> Response Examples

> 200 Response

```json
{}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|成功|Inline|

### Responses Data Schema
