# bigbro

Discord bot that assists with moderation duties for the [VEX Robotics Competition server](https://discord.gg/vrc).

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

- [Node.js](https://nodejs.org/)

### Environment Variables

|       Variable       | Required |              Default               |                              Description                               |
| :------------------: | :------: | :--------------------------------: | :--------------------------------------------------------------------: |
|   `DISCORD_TOKEN`    |    ✓     |                                    |              Token of the Discord account to log in with               |
| `ROBOT_EVENTS_TOKEN` |    ✓     |                                    |                         Robot Events API token                         |
|     `LOG_LEVEL`      |          |               `info`               |                           Minimum log level                            |
| `MESSAGE_CACHE_SIZE` |          |               `250`                | Maximum number of messages (including all pinned) to cache per channel |
|     `MONGO_URL`      |          | `mongodb://localhost:27017/bigbro` |                     MongoDB server connection URI                      |
|      `NODE_ENV`      |          |           `development`            |                    Node.js application environment                     |

### Installing

Install dependencies

```sh
npm install
```

Start the bot

```sh
npm run dev
```

## Deployment

Install dependencies

```sh
npm install
```

Compile source

```sh
npm run build
```

Start the bot

```sh
npm start
```

## Authors

- **Jordan Kiesel** - [LinkedIn](https://www.linkedin.com/in/jtkiesel/)

See also the list of [contributors](https://github.com/jtkiesel/bigbro/contributors) who participated in this project.

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
