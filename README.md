sjjj
====
an SMTP library? written for Deno


current state
-------------
I wrote sjjj mainly to
- explore currying
- explore how web protocols work

that being said, I don't really know if you would want to use it for anything other than exploring how SMTP works

currently, the only way to properly close the connection to the server is to (gracefully?) crash the program

also, you have to write the whole (including headers) email on your own


example script
--------------
```javascript
import * as smtp from './sjjj.js'

// connect to server
const server = await smtp.connect('smtp.gmail.com')

// authenticate a@gmail.com
await smtp.auth(server)('a@gmail.com')('password')

// get ready to send something from a@gmail.com to b@gmail.com
const send_to_myself = smtp.send(server)('a@gmail.com')('b@gmail.com')

// write the email
const msg =
`From: me <a@gmail.com>
To: you <b@gmail.com>
Subject: I like pizza

pizza is delicious`

// send the email (to b@gmail.com)
await send_to_myself(msg)

// close the connection to the server (by crashing program)
server(null)(null)
```