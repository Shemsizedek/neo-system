<?php
defined('ABSPATH') || exit;
return json_decode(<<<'NEO_CURRENCY_REGISTRY'
{
  "schemaVersion": "2026-10-19",
  "source": "data/neo-counter/world-currencies.csv",
  "sourceSha": "a518186bc00acbf1d528b543ddabb609b9ae3f12",
  "sourceTreasury": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
  "stewardshipTreasury": "18SzD3cfwCcV9p6C38ho4uZPHE8ygVB9iq",
  "currencies": [
    {
      "id": "nmni",
      "symbol": "NMNI",
      "name": "Nomni",
      "counterpartyAsset": "NOMNI",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_verification_pending"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "svc",
      "symbol": "SVC",
      "name": "Sovereign Coin",
      "counterpartyAsset": "SOVEREIGNC",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_verification_pending"
        },
        "cp20": {
          "status": "treasury_verification_pending"
        }
      }
    },
    {
      "id": "mrc",
      "symbol": "MRC",
      "name": "Moor Cash",
      "counterpartyAsset": "MOORCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "mor",
      "symbol": "MOR",
      "name": "Moor Coin",
      "counterpartyAsset": "MOORCOIN",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": true,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": true,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "1AssetiB9oec9pmbTThvCLFqBPcLSaQGjB",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "mxc",
      "symbol": "MXC",
      "name": "Mexia Coin",
      "counterpartyAsset": "MEXICACOIN",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": true,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": true,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "neo",
      "symbol": "NEO",
      "name": "Neo Cash",
      "counterpartyAsset": "NEOCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "1AssetiB9oec9pmbTThvCLFqBPcLSaQGjB",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "btc",
      "symbol": "BTC",
      "name": "Bitcoin",
      "counterpartyAsset": "BTC",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": null,
      "verification": {
        "classic": {
          "status": "native_asset",
          "divisible": true
        },
        "cp20": {
          "status": "native_asset",
          "divisible": true
        }
      }
    },
    {
      "id": "xcp",
      "symbol": "XCP",
      "name": "Counterparty",
      "counterpartyAsset": "XCP",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": null,
      "verification": {
        "classic": {
          "status": "native_asset",
          "divisible": true
        },
        "cp20": {
          "status": "native_asset",
          "divisible": true
        }
      }
    },
    {
      "id": "erc",
      "symbol": "ERC",
      "name": "Europa Cash",
      "counterpartyAsset": "EUROPACASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "stc",
      "symbol": "STC",
      "name": "Sterling Cash",
      "counterpartyAsset": "STERLINGCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "1AssetiB9oec9pmbTThvCLFqBPcLSaQGjB",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "rpc",
      "symbol": "RPC",
      "name": "Rupee Cash",
      "counterpartyAsset": "RUPEECASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "1AssetiB9oec9pmbTThvCLFqBPcLSaQGjB",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "adc",
      "symbol": "ADC",
      "name": "Eustri Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "cdc",
      "symbol": "CDC",
      "name": "Canadia Cash",
      "counterpartyAsset": "CANADIACASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "sgc",
      "symbol": "SGC",
      "name": "Singap Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "swc",
      "symbol": "SWC",
      "name": "Swiss Cash",
      "counterpartyAsset": "SWISSCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "olm",
      "symbol": "OLM",
      "name": "Olmec Cash",
      "counterpartyAsset": "OLMECCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "rgc",
      "symbol": "RGC",
      "name": "Ringgit Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "ync",
      "symbol": "YNC",
      "name": "Yen Cash",
      "counterpartyAsset": "YENCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "rmc",
      "symbol": "RMC",
      "name": "Renminbi Cash",
      "counterpartyAsset": "RENMINBICASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "zlc",
      "symbol": "ZLC",
      "name": "Zeal Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "bhc",
      "symbol": "BHC",
      "name": "Baht Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "ftc",
      "symbol": "FTC",
      "name": "Forint Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "dmc",
      "symbol": "DMC",
      "name": "Dirham Cash",
      "counterpartyAsset": "DIRHAMCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "hgc",
      "symbol": "HGC",
      "name": "Hong Cash",
      "counterpartyAsset": "HONGCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "ptn",
      "symbol": "PTN",
      "name": "Peso Cash",
      "counterpartyAsset": "PESOCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "rdc",
      "symbol": "RDC",
      "name": "Rand Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "krc",
      "symbol": "KRC",
      "name": "Krona Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "rhc",
      "symbol": "RHC",
      "name": "Rupiah Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "ryc",
      "symbol": "RYC",
      "name": "Riyal Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "rel",
      "symbol": "REL",
      "name": "Real Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "lrc",
      "symbol": "LRC",
      "name": "Lira Cash",
      "counterpartyAsset": "LIRACASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "sgc-2",
      "symbol": "SGC",
      "name": "Shilling Cash",
      "counterpartyAsset": "SHILLINGCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "wnc",
      "symbol": "WNC",
      "name": "Won Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "pdc",
      "symbol": "PDC",
      "name": "Pound Cash",
      "counterpartyAsset": "POUNDCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "drc",
      "symbol": "DRC",
      "name": "Dinar Cash",
      "counterpartyAsset": "DINARCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "knc",
      "symbol": "KNC",
      "name": "Krone Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "rbc",
      "symbol": "RBC",
      "name": "Ruble Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "slc",
      "symbol": "SLC",
      "name": "Shekel Cash",
      "counterpartyAsset": "SHEKELCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "zlc-2",
      "symbol": "ZLC",
      "name": "Zloty Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "ilc",
      "symbol": "ILC",
      "name": "Rial Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "twc",
      "symbol": "TWC",
      "name": "Taiwa Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "czk",
      "symbol": "CZK",
      "name": "Koruna Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "dgc",
      "symbol": "DGC",
      "name": "Dong Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "hvc",
      "symbol": "HVC",
      "name": "Hryvnia Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "nrc",
      "symbol": "NRC",
      "name": "Naira Cash",
      "counterpartyAsset": "NAIRACASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": true,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": true,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "luc",
      "symbol": "LUC",
      "name": "Leu Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "tkc",
      "symbol": "TKC",
      "name": "Taka Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "sch",
      "symbol": "SCH",
      "name": "Sol Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "lrh",
      "symbol": "LRH",
      "name": "Lari Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "fjc",
      "symbol": "FJC",
      "name": "Fiji Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "bvc",
      "symbol": "BVC",
      "name": "Bolívar Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "rbc-2",
      "symbol": "RBC",
      "name": "Ruble Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "kuc",
      "symbol": "KUC",
      "name": "Kuna Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "smc",
      "symbol": "SMC",
      "name": "Som Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "lvc",
      "symbol": "LVC",
      "name": "Lev Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "irr",
      "symbol": "IRR",
      "name": "Rial Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "crc",
      "symbol": "CRC",
      "name": "Colon Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "jmc",
      "symbol": "JMC",
      "name": "Jama Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "ghc",
      "symbol": "GHC",
      "name": "Ghana (Cedi) Cash",
      "counterpartyAsset": "GHANACASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": true,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": true,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "1AssetiB9oec9pmbTThvCLFqBPcLSaQGjB",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "kzc",
      "symbol": "KZC",
      "name": "Kwanza Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "egc",
      "symbol": "EGC",
      "name": "Efghani Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "tnc",
      "symbol": "TNC",
      "name": "Trin Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "lec",
      "symbol": "LEC",
      "name": "Lek Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "qzc",
      "symbol": "QZC",
      "name": "Quetzal Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "boc",
      "symbol": "BOC",
      "name": "Bolíviano Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "zwc",
      "symbol": "ZWC",
      "name": "Zimbabwean Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "bjc",
      "symbol": "BJC",
      "name": "Bajan Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "lkc",
      "symbol": "LKC",
      "name": "Lao Kip Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "bnc",
      "symbol": "BNC",
      "name": "Bruneian Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "pac",
      "symbol": "PAC",
      "name": "Pula Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "lpc",
      "symbol": "LPC",
      "name": "Lempira Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "grc",
      "symbol": "GRC",
      "name": "Guarani Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "brc",
      "symbol": "BRC",
      "name": "Birr Cash",
      "counterpartyAsset": "BIRRCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "nac",
      "symbol": "NAC",
      "name": "Namibian Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "kac",
      "symbol": "KAC",
      "name": "Kina Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "pca",
      "symbol": "PCA",
      "name": "Pataca Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "cbc",
      "symbol": "CBC",
      "name": "Cordoba Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "bmc",
      "symbol": "BMC",
      "name": "Bermudian Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "tgc",
      "symbol": "TGC",
      "name": "Tenge Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "blc",
      "symbol": "BLC",
      "name": "Balboa Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "mka",
      "symbol": "MKA",
      "name": "Marka Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "gyc",
      "symbol": "GYC",
      "name": "Guyanese Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "eyc",
      "symbol": "EYC",
      "name": "Eriary Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "mnc",
      "symbol": "MNC",
      "name": "Caymanian Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "mtc",
      "symbol": "MTC",
      "name": "Metical Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "dmc-2",
      "symbol": "DMC",
      "name": "Dram Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "soc",
      "symbol": "SOC",
      "name": "Solomon Islander Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "mtc-2",
      "symbol": "MTC",
      "name": "Manat Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "lnc",
      "symbol": "LNC",
      "name": "Leone Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "pgc",
      "symbol": "PGC",
      "name": "Pa’anga Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "bzc",
      "symbol": "BZC",
      "name": "Belizean Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "mwc",
      "symbol": "MWC",
      "name": "Kwacha Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "gmc",
      "symbol": "GMC",
      "name": "Dalasi Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "gdc",
      "symbol": "GDC",
      "name": "Gourde Cash",
      "counterpartyAsset": "GOURDECASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "1AssetiB9oec9pmbTThvCLFqBPcLSaQGjB",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "rfc",
      "symbol": "RFC",
      "name": "Rufiyaa Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "tkc-2",
      "symbol": "TKC",
      "name": "Tughrik Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "dbc",
      "symbol": "DBC",
      "name": "Dobra Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "tjc",
      "symbol": "TJC",
      "name": "Tajikistani Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "ktc",
      "symbol": "KTC",
      "name": "Kyat Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "lot",
      "symbol": "LOT",
      "name": "Loti Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "lrc-2",
      "symbol": "LRC",
      "name": "Liberian Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "leu",
      "symbol": "LEU",
      "name": "Leu Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "rlc",
      "symbol": "RLC",
      "name": "Riel Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "den",
      "symbol": "DEN",
      "name": "Denar Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "vuc",
      "symbol": "VUC",
      "name": "Vatu Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "oyc",
      "symbol": "OYC",
      "name": "Ouguiya Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "grc-2",
      "symbol": "GRC",
      "name": "Guilder Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "lgc",
      "symbol": "LGC",
      "name": "Lilangeni Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "esc",
      "symbol": "ESC",
      "name": "Escudo Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "smc-2",
      "symbol": "SMC",
      "name": "Surinamese Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "nlc",
      "symbol": "NLC",
      "name": "Ngultrum Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "tlc",
      "symbol": "TLC",
      "name": "Tala Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "lug",
      "symbol": "LUG",
      "name": "Luigino Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "nfc",
      "symbol": "NFC",
      "name": "Nakfa Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "tvc",
      "symbol": "TVC",
      "name": "Tuvaluan Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "syg",
      "symbol": "SYG",
      "name": "Synergy Cash",
      "counterpartyAsset": "SYNERGYCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": true,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": true,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "1AssetiB9oec9pmbTThvCLFqBPcLSaQGjB",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "zmc",
      "symbol": "ZMC",
      "name": "Zambia (Kwacha) Cash",
      "counterpartyAsset": "ZAMBIACASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "1AssetiB9oec9pmbTThvCLFqBPcLSaQGjB",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "gec",
      "symbol": "GEC",
      "name": "Geneih Cash",
      "counterpartyAsset": "GENEIHCASH",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    },
    {
      "id": "bsc",
      "symbol": "BSC",
      "name": "Bahamian Cash",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "cpn",
      "symbol": "CPN",
      "name": "Credit Profile Number Token",
      "counterpartyAsset": null,
      "enabledForCollection": false,
      "status": "asset_mapping_required",
      "verification": {
        "classic": {
          "status": "asset_mapping_required"
        },
        "cp20": {
          "status": "asset_mapping_required"
        }
      }
    },
    {
      "id": "mbt",
      "symbol": "MBT",
      "name": "Mobi Token",
      "counterpartyAsset": "MOBITOKEN",
      "enabledForCollection": false,
      "status": "daily_market_reference_required",
      "expectedOwner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
      "verification": {
        "classic": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        },
        "cp20": {
          "status": "treasury_asset_verified",
          "divisible": false,
          "owner": "18FyntJG9hdXYvanm67mGgbyo1P7adckvg",
          "issuer": "1AssetiB9oec9pmbTThvCLFqBPcLSaQGjB",
          "verifiedAt": "2026-10-19T20:39:57.617265+00:00"
        }
      }
    }
  ],
  "collectionAddress": "18SzD3cfwCcV9p6C38ho4uZPHE8ygVB9iq",
  "bondSourceAddress": "1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8",
  "sourceCatalog": "https://worldcurrency.finance.blog/",
  "verificationSource": "world-currency-audit-2026-10-19.json"
}
NEO_CURRENCY_REGISTRY
,true);
