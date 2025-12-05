# PYTH ORACLE

```
curl -X POST http://localhost:3000/price/update-two \
  -H "Content-Type: application/json" \
  -d '{
    "token1": {
      "priceId": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
      "coinType": "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
    },
    "token2": {
      "priceId": "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
      "coinType": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"
    },
    "createPort": {
      "startCoinAId": "0x5dd7e5c558c6aa212e2080515a4d17adb38e6db9aeaa106baaa8c59796167047",
      "startCoinBId": "0x812375271d00dee33c7b749ef16e095b6c8dc426985d1435f9d753ad55cb74aa"
    }
  }'
  ```