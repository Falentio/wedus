import { Router } from "https://esm.sh/itty-router@2.4.4";
import { listenAndServe } from "https://deno.land/std@0.113.0/http/mod.ts";

const PORT: string = ":" + (Deno.env.get("PORT") || "8080");
const router = Router();
const WEB3TOKEN = Deno.env.get("WEB3TOKEN");
const REQ_PER_SECOND = +(Deno.env.get("REQ_PER_SECOND") || 2);
const MAX_BODY_SIZE = +(Deno.env.get("MAX_BODY_SIZE") || 1024 * 1024);

if (REQ_PER_SECOND < 0) {
	throw new Error("invalid value for REQ_PER_SECOND");
}

if (MAX_BODY_SIZE < 0) {
	throw new Error("invalid value for MAX_BODY_SIZE");
}

if (WEB3TOKEN === undefined) {
	throw new Error("cannt find WEB3TOKEN env variable");
}

if (!await testToken(WEB3TOKEN)) {
	throw new Error("invalid WEB3TOKEN");
}

async function testToken(token: string): Promise<boolean> {
	const response = await fetch("https://api.web3.storage/user/uploads", {
		headers: {
			"authorization": "Bearer " + token,
		},
	});
	return response.ok;
}

const limit: Record<string, {
	remain?: number;
	date?: number;
}> = {};

router.all("*", (request, conn) => {
	const e: string = conn.remoteAddr.hostname + "";
	const info = JSON.stringify({
		ip: e,
		method: request.method,
		url: request.url,
	});
	console.info(info);
	if (REQ_PER_SECOND === 0) {
		return;
	}
	limit[e] ??= {};
	limit[e].date ??= Date.now() + 1000;
	limit[e].remain ??= REQ_PER_SECOND;
	if (limit[e].date as number < Date.now()) {
		limit[e].date = Date.now() + 1000;
		limit[e].remain = REQ_PER_SECOND;
	}
	if (limit[e].remain as number < 1) {
		return new Response(
			JSON.stringify({
				success: false,
				message: "too much request, limit 2 req/s",
			}),
			{
				status: 429,
				headers: {
					"content-type": "application/json",
				},
			},
		);
	}
	limit[e].remain = limit[e].remain as number - 1;
});

router.post("/create", async (request) => {
	const body = new FormData();
	const blob = await request?.blob?.();
	if (blob === undefined) {
		return new Response(
			JSON.stringify({
				success: false,
				message: "body is required",
			}),
			{
				status: 400,
				headers: {
					"content-type": "application/json",
				},
			},
		);
	}
	if (MAX_BODY_SIZE !== 0 && blob.size > MAX_BODY_SIZE) {
		return new Response(
			JSON.stringify({
				success: false,
				message: "body too large, maximum is 1MB, received: " +
					blob.size,
			}),
			{
				status: 413,
				headers: {
					"content-type": "application/json",
				},
			},
		);
	}
	const file = new File([blob], "wedus");
	body.append("file", file);
	const response = await fetch("https://api.web3.storage/upload", {
		method: "POST",
		body,
		headers: {
			"authorization": "Bearer " + WEB3TOKEN,
		},
	});
	const json: {
		cid?: string;
		name?: string;
		message?: string;
	} = await response.json().catch((_) => ({}));
	if (json.cid !== undefined) {
		return new Response(
			JSON.stringify({
				success: true,
				url: new URL("/#" + json.cid, request.url).href,
			}),
			{
				status: 201,
				headers: {
					"content-type": "application/json",
				},
			},
		);
	}
	if (json.name !== undefined && json.message !== undefined) {
		return new Response(
			JSON.stringify({
				message: "failed to create",
				success: false,
			}),
			{
				status: 400,
				headers: {
					"content-type": "application/json",
				},
			},
		);
	}
	return new Response("", {
		status: 500,
	});
});

const content = await Deno
	.readTextFile("./index.html");

router.get("/", () => {
	return new Response(content, {
		headers: {
			"content-type": "text/html",
			"cache-control": "public, max-age=3600, immutable",
		},
	});
});

router.all("/favicon.ico", () =>
	new Response("Not Found", {
		status: 404,
	}));

router.all("*", () =>
	new Response("redirect", {
		status: 301,
		headers: {
			location: "/#",
		},
	}));

listenAndServe(PORT, (request, conn) => {
	return router.handle(request, conn)
		.catch((e: unknown) => {
			console.error(e);
			return new Response("", {
				status: 500,
			});
		});
});
