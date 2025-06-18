# JaMoveo: Moveo Rehearsal App

Home assignment by Nitai Edelberg

## About

JaMoveo is a web app for managing live music sessions for bands and friends.
Musicians and singers can log in from their computer or phone, join a rehearsal and play together in real time.

**Built with:**

* Node.js (Express) backend
* React + Bootstrap frontend
* PostgreSQL (Supabase) database
* socket.io for live updates

## How it works

* Users sign up (musicians or admin)
* Admin creates a new rehearsal session
* Admin searches for a song and picks it for the group
* Everyone in the session sees the song, with chords for musicians and only lyrics for singers
* Everything updates in real time thanks to socket.io so no refresh needed

## How to run 
The web app is Deployed, so you can visit it here: [JaMoveo](https://jam-oveo.netlify.app/).

## How to run locally

you would need the .env variables, so contact me or chose your own postgresql DB URI.

**Backend:**

```
cd Backend
npm install
npm start
```

**Frontend:**

```
cd Frontend
npm install
npm run dev
```

Website will open at: [http://localhost:5173](http://localhost:5173).
you sould change the backend in the env to localhost.

## Register

* Regular user: `/signup`
* Admin user: `/signup-admin`

## Why socket.io?

We need real-time connection so when the admin picks a song all users see it immediately

---

Nitai Edelberg
