module.exports = {
    apps: [
        {
            name: "kojima-bot",
            script: "src/index.ts",
            interpreter: "bun",
            env: {
                PATH: `${process.env.PATH}:${process.env.HOME}/.bun/bin`,
            },
        },
    ],
};
