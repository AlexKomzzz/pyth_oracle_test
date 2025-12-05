#!/bin/bash

source ./export.sh

export PACKAGE=0xb0a250c33abcd0b4141bf5cad5a9a241bd1dce93d4b46b06cb92fae001273cf4
export VAULT_CONFIG=0x476e856fae861456921e2867ab5e465a9575cf60ab456d2e5f6d342420b95512
export ADMIN_CAP=0x3fa6c84460f8aa51f562c416aba88f45c9c42594a779739c8dee56cbe4fc7e39
export PORT_ORACLE=0x2c2648e86913698709b1fb1e5a9ef3127d5d2e65e6b544459075a3c7b62e177e
export PORT_REGISTRY=0x82fe6bafac77bcf7f00ad7f3f1a517f2f63b0298fca0a995bf3f62dad0142446
export UPGRADE_CAP=0x5e571035f3903090d3f857617020d658582bb81e6ac4c0af2dd787a976073dbb
export ADDR=$(sui client active-address)
export CLOCK=0x6

export FULLSAIL_TOKEN_TYPE="0x9420f87aeaf1cd23fa613aeebe3942d1055b4a821439a24d9a703f828aa69fc0::SAIL::SAIL"

export CLMM_GLOBAL_CONFIG=0x03b9c9a7889bb4c1144c079d5074432fc9a58d67c062f27cf6390967f3095843
export CLMM_VAULT=0x96eeac7f51cd7697c68d3026c782750f178e7e477d51c0f9e4a9972a80889a51
export DISTRIBUTION_CONFIG=0xdfb3cafdc799abf00dc5a05e91b5fc6197cd87c48556d26e00612a6abce3c14a
export DISTRIBUTE_GOVERNOR_CAP=0x6bf35cbbdc9344b95d43901eb6985a4fce8dc7543923356d6024f277c364fc94

# Pyth State object ID (shared object from Pyth package)
# https://docs.pyth.network/price-feeds/core/contract-addresses/sui
export PYTH_STATE=0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8

# Coin types for the pool
export COIN_A=0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC
export COIN_B=0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI
export POOL=0xe455d2ce2e83bbe3b47615ee2727dc6c9ffbf022c98fd1c1bfc43535b79c13a2
export GAUGE=0x5c0326e7c8c0aa53afc8a81443b454c8ae46f9d0a29b20b7355d0e32b39a424a

# Liquidity position parameters
export LOWER_OFFSET=5000      # Lower tick offset from current price (u32)
export UPPER_OFFSET=5000      # Upper tick offset from current price (u32)
export REBALANCE_THRESHOLD=4000 # Rebalance threshold in ticks (u32)

# Port parameters
export QUOTE_TYPE_A=true     # true if CoinTypeA is used as base currency, false if CoinTypeB
export HARD_CAP=1000000000  # Maximum port capitalization in base currency (u128)

# Initial balances (Coin IDs to be converted to Balance)
# These coins must be available to the transaction sender
export START_COIN_A_ID=0x7db0b4f6ed3b276d8e9eca2d57c8b42593ad8931fe89e35c1d233154ef8309b7  # CoinTypeA coin ID for initial balance
export START_COIN_B_ID=0x313d714f089daa6e8282a830582e3cbd81d004e29490cfd017db0e25553cf8b6  # CoinTypeB coin ID for initial balance

sui client ptb \
  --move-call sui::coin::into_balance "<$COIN_A>" @$START_COIN_A_ID \
  --assign balance_a \
  --move-call sui::coin::into_balance "<$COIN_B>" @$START_COIN_B_ID \
  --assign balance_b \
  --move-call $PACKAGE::port::create_port \
    "<$COIN_A,$COIN_B>" \
    @$VAULT_CONFIG \
    @$PORT_REGISTRY \
    @$PORT_ORACLE \
    @$CLMM_GLOBAL_CONFIG \
    @$CLMM_VAULT \
    @$DISTRIBUTION_CONFIG \
    @$GAUGE \
    @$POOL \
    $LOWER_OFFSET \
    $UPPER_OFFSET \
    $REBALANCE_THRESHOLD \
    $QUOTE_TYPE_A \
    $HARD_CAP \
    balance_a \
    balance_b \
    @$CLOCK
