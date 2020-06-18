sjjj
=====
an SMTP library? written with Deno standard library


example
--------
```javascript
import smtp_connect from './sjjj.js'

// connect to server
const server = await smtp_connect('smtp.gmail.com')

// authenticate
await server.auth('username')('password')

// write email
const msg =
`From: me <a@gmail.com>
To: you <b@gmail.com>
Subject: I like pizza

pizza is delicious`

// send email
await server.send('a@gmail.com')('b@gmail.com')(msg)

// finish using server
server.quit()
```


features
---------
- you can send email
- you can manually extend functionality with provided `communicator` and `standard_communicator` functions
- code has comments
- code is one file under 150 lines long


notes
------
- only works with SSL (no STARTTLS)
- you have to write the whole (including headers) email on your own