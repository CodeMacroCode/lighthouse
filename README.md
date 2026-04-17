## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Note


**<mark>If you get an error like this "unhandledRejection: [TypeError: localStorage.getItem is not a function]" in the terminal or "server error 500 in web UI" while running the project in development mode with this command:</mark>**


```bash
npm run dev
```

then run this command:

```bash
export NODE_OPTIONS="--no-webstorage"
npm run dev
```# lighthouse
