
#include <sstream>
#include <string>

#include "value.h"

Value::Value ( ) {
  type = t_integer;
  raw_value = "";
}

Value::Value ( int t, const std::string & s ) {
  type = t;
  raw_value = s;
}

Value::Value ( const Value & v ) {
  type = v.type;
  raw_value = v.raw_value;
}

int Value::getType() {
  return type;
}

std::string & Value::getRawValue() {
  return raw_value;
}

int Value::value_as_address() {
  return value_as_integer();
}

bool Value::value_as_boolean() {
  if ( raw_value == "true" ) return true;
  if ( raw_value == "false" ) return false;
  return 0 != value_as_integer();
}

char Value::value_as_char() {
  return raw_value[0];
}

int Value::value_as_integer() {
  int i;
  std::stringstream s(raw_value);
  s >> i;
  return i;
}

double Value::value_as_real() {
  double d;
  std::stringstream s(raw_value);
  s >> d;
  return d;
}

std::string & Value::value_as_string() {
  return raw_value;
}

