# flaka
Streaming player for web player using shaka-player()

## How to use flaka

```typescript
const options = {
  onTimeUpdate: (duration) => void;
  onDurationUpdate: (duration) => void;
}

const streamingPlayer = new StreamingPlayer('streaming-player-id', options);

streamingPlayer.play(url: string, serverUrl: string, token: string);
```

## Development

Flaka uses typescript.

### Development setup
```sh
git clone git@github.com:Rhapsody/flaka.git
cd flaka
yarn
```

### Editor setup
For VS Code you should install eslint and prettier as an extension.
