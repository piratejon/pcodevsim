/****
  jstone25@uco.edu, 2014-08-16
  Value defines the type and content of an item pushed onto the p-code machine
  datastore stack.
  ****/

#if ! defined ( _PCODE_VALUE )
#define _PCODE_VALUE

#include <string>

enum type {
  t_address,
  t_boolean,
  t_character,
  t_integer,
  t_real,
  t_string,
  t_set,
  t_procedure,
  t_dontcare
};

class Value {
  private:
    std::string raw_value;
    int type;

  public:
    Value ( );
    Value ( const Value & );
    Value ( int, const std::string & );

    int getType();
    std::string & getRawValue();

    int value_as_address();
    bool value_as_boolean();
    char value_as_char();
    int value_as_integer();
    double value_as_real();
    std::string & value_as_string();
    // set?
    // procedure?
    // dontcare?
};

#endif // _PCODE_VALUE

