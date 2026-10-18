// NCHIP-009 sensor-only ESP32-S3 evaluation firmware. Arduino core for ESP32.
// Prototype pinout: SDA=GPIO8, SCL=GPIO9; verify against your board.
// Drivers limited to TMP117 temperature sensor; other modules require verified drivers.
#include <Arduino.h>
#include <Wire.h>

static const uint8_t TMP117_ADDR = 0x48;
static uint32_t seq = 0;
static unsigned long previous = 0;

bool readTMP117(float &celsius) {
  Wire.beginTransmission(TMP117_ADDR);
  Wire.write(0x00); // temperature register
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(TMP117_ADDR, (uint8_t)2) != 2) return false;
  const uint16_t raw = (uint16_t(Wire.read()) << 8) | Wire.read();
  celsius = (int16_t)raw * 0.0078125f; // TMP117 datasheet conversion
  return isfinite(celsius) && celsius >= -40.0f && celsius <= 125.0f;
}

void setup() {
  Serial.begin(115200);
  Wire.begin(8, 9);
  Wire.setClock(100000);
  // No WiFi, BLE, radio transmit routine or therapeutic output.
}

void loop() {
  if (millis() - previous < 1000) return;
  previous = millis();
  float temperature;
  if (!readTMP117(temperature)) {
    Serial.println("{\"protocol\":\"nchip.sensor.v1\",\"error\":\"tmp117_unavailable\"}");
    return;
  }
  ++seq;
  Serial.printf("{\"protocol\":\"nchip.sensor.v1\",\"device_id\":\"NCHIP-DEV-A\",\"sequence\":%lu,\"sensor\":\"temperature_c\",\"units\":\"C\",\"value\":%.4f,\"source\":\"tmp117\"}\n", (unsigned long)seq, temperature);
}
