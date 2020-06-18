/************************************/
/** how to actually talk to server **/
/************************************/

import { BufReader, readLines } from 'https://deno.land/std/io/bufio.ts'
import { encode } from 'https://deno.land/std/encoding/utf8.ts'

/* sends a message to connection then waits for
** a response code that satisfies the given validator or errorer
** e.g. `await communicator(conn)('ehlo hi')(C.serv_ready)` means:
**       send "ehlo hi\r\n" over conn
**       and wait until it returns 220 (parsed from the start of the message)
**       also, crash the program if it returns >= 500
*/
const communicator =
	conn => message => async (validator, errorer) => {

		if (message == null) {
			conn.close()
			throw 'fatal: cannot send null message'
		}

		const response = readLines(new BufReader(conn))

		// writes message to connection
		console.error(`sending: ${message}`)
		conn.write(encode(message + '\r\n'))

		// read all msges from connection until we find
		// something that satisfies validator or errorer
		for await (const got_msg of response) {

			// extract code from response
			const code = Number((got_msg.match(/^(\d+)/) || [])[1])

			// crash if no code was found
			if (isNaN(code)) {
				conn.close()
				throw 'fatal: server did not return response code'
			}

			const msg = got_msg.replace(/[\r\n]+$/, '')

			// crash if server returned error
			if (errorer(code)) {
				conn.close()
				throw `fatal: server returned undesired response code: ${msg}`
			}

			// continue if this was not code we were looking for
			if (!validator(code)) {
				console.error(`received irrelevant: ${msg}`)
				continue
			}

			console.error(`received expected: ${msg}`)
			return msg

		}

	}

/* a communicator that sends a message
** and waits for `code`
** and crashes on 500+
*/
const standard_communicator =
	conn => message => code =>
		communicator(conn)(message)(c => c === code, e => e >= 500)

/*******************************/
/** what to say to the server **/
/*******************************/

// SMTP codes
const C = {
	serv_ready: 220,
	auth_succe: 235,
	serv_okayy: 250,

	auth_promp: 334,
	data_start: 354,
}

/* connects to an SMTP server
** returns a bound 'communicator' function that can be
** used by smpt_auth and smtp_send
*/
const connect =
	async (hostname, port=465) => {

		const conn = await Deno.connectTls({ hostname, port })
		const comm = standard_communicator(conn)

		await comm('ehlo hi')(C.serv_ready)

		const self = { conn, comm }
		self.auth  = auth(self)
		self.send  = send(self)
		self.close = () => conn.close()

		return self

	}

/* sends authentication to the server
*/
const auth =
	({ comm }) => username => async password => {

		await  comm('auth login')         (C.auth_promp)
		await  comm(window.btoa(username))(C.auth_promp)
		return comm(window.btoa(password))(C.auth_succe)

	}

/* commands server to send a message
** note: you probably need to authenticate with
**       smpt_auth before you use this function
*/
const send =
	({ comm }) => email_from => (...emails_to) => async message => {

		await comm(`mail from:<${email_from}>`)(C.serv_okayy)

		for (const email of emails_to)
			await comm(`rcpt to:<${email}>`)(C.serv_okayy)

		await  comm('data')           (C.data_start)
		return comm(`${message}\r\n.`)(C.serv_okayy)

	}

// export
export default connect
export { communicator, standard_communicator }