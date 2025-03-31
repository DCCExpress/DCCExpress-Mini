// HTTPServer.cpp

#include "DCCEXParser.h"
#include "HTTPServer.h"

AsyncWebServer httpServer(80);
AsyncWebSocket ws("/ws");
#include <ArduinoJson.h>
#include "DIAG.h"

void dccParseRaw(const String &raw)
{
  //Serial.println("RAW: " + raw);
  const char *cmd = raw.c_str();
  DCCEXParser::parse(cmd);
}

void sendFormattedInfo(String s)
{
  for (auto *client : ws.getClients())
  {
    if (client && client->status() == WS_CONNECTED)
    {
      String json = "{\"type\":\"rawInfo\",\"data\":{\"raw\":\"" + s + "\"}}";
      client->text(json);
    }
  }
}

void setupHTTPServer()
{
  if (!LittleFS.begin(true))
  {
    Serial.println("LittleFS mount error!");
    return;
  }
  Serial.println("LittleFS started!");
  LCD(4, F("HTTP: FS error"));

  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");

  httpServer.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

  httpServer.on("/list", HTTP_GET, [](AsyncWebServerRequest *request)
                {
        File root = LittleFS.open("/");
        File file = root.openNextFile();
    
        String json = "[";
        bool first = true;
        while (file) {
          if (!first) json += ",";
          json += "{\"name\":\"" + String(file.name()) + "\",";
          json += "\"size\":" + String(file.size()) + "}";
          file = root.openNextFile();
          first = false;
        }
        json += "]";
        AsyncWebServerResponse* response = request->beginResponse(200, "application/json", json);
        response->addHeader("Access-Control-Allow-Origin", "*");
        request->send(response); });

  httpServer.on("/delete", HTTP_GET, [](AsyncWebServerRequest *request)
                {
                  if (request->hasParam("fn"))
                  {
                    String path = "/" + request->getParam("fn")->value();
                    LittleFS.remove(path);
                  }
                  AsyncWebServerResponse *response = request->beginResponse(200, "text/plain", "OK");
                  response->addHeader("Access-Control-Allow-Origin", "*");
                  request->send(response); });

  httpServer.on("/upload", HTTP_POST, [](AsyncWebServerRequest *request)
                { 
                  AsyncWebServerResponse *response = request->beginResponse(200, "text/plain", "OK");
                  response->addHeader("Access-Control-Allow-Origin", "*");

                  request->send(200, "text/plain", "OK"); }, [](AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final)
                {
        static File uploadFile;
        if (!index) uploadFile = LittleFS.open("/" + filename, "w");
        if (uploadFile) uploadFile.write(data, len);
        if (final && uploadFile) uploadFile.close(); });

  httpServer.on("/fsinfo", HTTP_GET, [](AsyncWebServerRequest *request)
                {
                  size_t total = LittleFS.totalBytes();
                  size_t used = LittleFS.usedBytes();

                  String json = "{";
                  json += "\"total\":" + String(total / 1024);
                  json += ",\"used\":" + String(used / 1024);
                  json += ",\"free\":" + String((total - used) / 1024);
                  json += "}";
                  AsyncWebServerResponse *response = request->beginResponse(200, "application/json", json);
                  response->addHeader("Access-Control-Allow-Origin", "*");
                  request->send(response); });

  ws.onEvent([](AsyncWebSocket *server, AsyncWebSocketClient *client,
                AwsEventType type, void *arg, uint8_t *data, size_t len)
             {
                if (type == WS_EVT_CONNECT) {
                Serial.println("WebSocket connect");
                } else if (type == WS_EVT_DISCONNECT) {
                Serial.println("WebSocket disconnect");
                } else if (type == WS_EVT_DATA) {
                String msg = String((char*)data).substring(0, len);
                Serial.println("WebSocket msg: " + msg);

                    JsonDocument doc;
                DeserializationError error = deserializeJson(doc, msg);
                if (error) {
                client->text("{\"type\":\"error\",\"data\":\"invalid_json\"}");
                return;
                }

                String type = doc["type"].as<String>();
                if (type == "dccexraw") {
                String raw = doc["data"]["raw"].as<String>();
                //Serial.println("DCCEX RAW: " + raw);

                server->textAll("{\"type\":\"ack\",\"data\":\""+ raw +"\"}");
                dccParseRaw(raw);

                
              } else {
                server->textAll("{\"type\":\"error\",\"data\":\"unknown_command\"}");
              }
      } });

  httpServer.addHandler(&ws);
  httpServer.begin();
  Serial.println("Webserver started!");
  LCD(4, F("HTTP: OK"));
}