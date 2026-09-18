# PetCard Backend

Express + MongoDB + JWT + bcrypt + Nodemailer authentication backend for PetCard.

## Authentication rules

- Only one account with the `admin` role can exist.
- Signup is available only while no admin exists.
- Admin signup sends a 6-digit OTP by email.
- OTP expires after 2 minutes.
- OTP can be resent only after 1 minute.
- Resending immediately invalidates the previous OTP.
- Successful OTP verification creates the admin and returns a JWT.
- Successful verification also logs the admin in by returning the JWT.
- The backend does not put JWTs in cookies or localStorage.
- Protected requests use `Authorization: Bearer <JWT>`.
- The frontend should keep the token only in runtime memory if persistence is not desired.
- Running the admin seed creates the initial verified admin, which permanently closes the signup flow until that admin is removed from MongoDB.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in `MONGO_URI`, `JWT_SECRET`, and SMTP settings. SMTP authentication requires `EMAIL_PASS` (SMTP password/app password) in addition to the variables listed in the original setup.
3. Install packages:

```bash
npm install
```

4. Start development server:

```bash
npm run dev
```



The seed contains the bcrypt hash; MongoDB never receives the plaintext password.

## API

### Signup status

`GET /api/auth/signup-status`

### Signup

`POST /api/auth/signup`

```json
{
  "name": "PetCard Admin",
  "email": "admin@example.com",
  "password": "Admin@123",
  "confirmPassword": "Admin@123"
}
```

### Verify OTP

`POST /api/auth/verify-otp`

```json
{
  "email": "admin@example.com",
  "otp": "123456"
}
```

The response contains a JWT after successful verification.

### Resend OTP

`POST /api/auth/resend-otp`

```json
{
  "email": "admin@example.com"
}
```

### Login

`POST /api/auth/login`

```json
{
  "email": "admin@petcard.com",
  "password": "Admin@123"
}
```

### Current admin

`GET /api/auth/me`

Header:

```text
Authorization: Bearer <JWT>
```
