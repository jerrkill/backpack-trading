# trading


Auto trade on Backpack exchange with Javascript:


- index.js auto trade
- grid trading



# usage

```
cp .env.example .env

```

config .env

```
API_KEY = ""
API_SECRET = ""
SYMBOL_PAIR = "JUP_USDC"
GRID_CENTER_PRICE=
NUMBER_OF_GRIDS=
CAPITAL_PER_GRID=
```


```
node ./autoGrid.js
```



node install

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

source ~/.profile

nvm install v18.19.0
```