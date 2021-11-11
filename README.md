# WEDUS!!!

Wedus is pastebin clone, and also immutable. All files are stored to
[web3.storage](https://web3.storage). You also able to deploy your own Wedus on
[deno deploy](https://deno.com/deploy) when you need more limit, by default the
limit is 2 req/s per ip

## Stack Used

[Flourite](https://github.com/teknologi-umum/flourite) for detect language from string\
[Web3.storage](https://web3.storage) for file storage\
[Deno](https://deno.land) for typescript/javascript runtime\
[Deno Deploy](https://deno.com/deploy) for hosting\
[Itty-Router](https://github.com/kwhitley/itty-router) for router\

## How To Create

HTTPie

```bash
http POST https://wedus.deno.dev/create @filename
```

curl

```bash
curl --data-binary @filename https://wedus.deno.dev
```

deno

```typescript
const wedus = async (pathToFile: string): Promise<string> => {
	const body = await Deno.readTextFile(pathToFile);
	const response = await fetch("https://wedus.deno.dev/create", {
		method: "POST",
		body,
	});
	const { url, message, success }: Record<string, any> = await response
		.json();
	if (success) {
		return url as string;
	}
	throw new Error(message);
};

await wedus("./index.html").then(console.log);
```

bash

```bash
# add bellow code to your bashrc
wedus(){ curl --data-binary @$1 "https://wedus.deno.dev/create" | jq .url;}
# then refresh using ". ~/.bashrc", and you are ready to using wedus
# example
wedus filename
```

## How To Deploy

1. Create project on deno deploy
2. Select deploy from github
3. Input this [url](./index.ts)
4. Enter your web3.storage apikey to WEB3TOKEN env variables
5. Done

> When you want to change the limit, just add MAX_BODY_SIZE and REQ_PER_SECOND
> to env variables\
> Set to zero for disable\
