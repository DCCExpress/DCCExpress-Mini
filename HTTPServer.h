



// pio run -e ESP32 --target uploadfs

// HTTPServer.h
#ifndef HTTPSERVER_H
#define HTTPSERVER_H

#include <Arduino.h>
#include <LittleFS.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>

extern AsyncWebServer httpServer;
extern AsyncWebSocket ws;

void setupHTTPServer();
void sendFormattedInfo(String s);
//void send2ToWebSocket(const FSH* format, va_list args);

#endif