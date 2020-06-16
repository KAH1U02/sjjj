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
	conn => message => async (validator, errorer=C.error) => {

		if (message == null) {
			conn.close()
			throw 'fatal: cannot send null message'
		}

		const response = readLines(new BufReader(conn))

		// writes message to connection
		conn.write(encode(message + '\r\n'))
		console.error(`sent: ${message}`)

		// read all msges from connection until we find
		// something that satisfies validator or errorer
		for await (const got_msg of response) {

			// extract code from response
			const code = Number(got_msg.match(/^(\d+)/)[1])

			// strip response to make logging cleaner
			const msg = got_msg.replace(/[\r\n]+$/, '')

			if (validator(code)) {
				console.error(`received expected: ${msg}`)
				return msg
			}

			if (errorer(code))
				throw `fatal: server returned undesired response code: ${msg}`

			console.error(`received irrelevant: ${msg}`)
		}

	}

/*******************************/
/** what to say to the server **/
/*******************************/

const eq =
	desired =>
		code => code === desired

// defines a bunch of different code 'validators', i.e.
// functions that take a code and return if it matches a pattern
// e.g. C.serv_ready(100) will produce false
//      C.serv_ready(220) will produce true
//      C.error(555)      will produce true
const C = {
	serv_ready: eq(220),
	auth_succe: eq(235),
	serv_okayy: eq(250),

	auth_promp: eq(334),
	data_start: eq(354),

	error: code => code >= 500
}

/* connects to an SMTP server
** returns a bound 'communicator' function that can be
** used by smpt_auth and smtp_send
*/
export const connect =
	async (hostname, port=465) => {

		const conn   = await Deno.connectTls({ hostname, port })
		const server = communicator(conn)

		await server('ehlo hi')(C.serv_ready)

		return server

	}

/* present authentication to the server
*/
export const auth =
	server => username => async password => {

		await  server('auth login')         (C.auth_promp)
		await  server(window.btoa(username))(C.auth_promp)
		return server(window.btoa(password))(C.auth_succe)

	}

/* commands server to send a message
** note: you probably need to authenticate with
**       smpt_auth before you use this function
*/
export const send =
	server => email_from => (...emails_to) => async message => {

		await server(`mail from:<${email_from}>`)(C.serv_okayy)

		for (const email of emails_to)
			await server(`rcpt to:<${email}>`)(C.serv_okayy)

		await  server('data')           (C.data_start)
		return server(`${message}\r\n.`)(C.serv_okayy)

	}