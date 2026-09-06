The acceptance probe reads only the local non-secret runtime state file. Live Discord credentials remain in the host secret store and are consumed by `gateway-bot.mjs`, not by this probe.
