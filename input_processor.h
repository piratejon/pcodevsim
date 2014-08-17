/****
  jstone25@uco.edu, 2014-08-15
  This class implements an input processor that allows a user to interface
  with the PCodeProgram p-code visual execution simulator.
  ****/

#if ! defined ( _PCODE_INPUT_PROCESSOR )
#define _PCODE_INPUT_PROCESSOR

#include <iostream>
#include <string>

enum ProcessControl {
  pc_step,
  pc_quit,
  pc_label,
  pc_help
};

class InputProcessor {
  private:
    std::istream * in;
    std::ostream * out;
    std::string prompt;

    std::string last_command;

  public:
    InputProcessor ( std::istream & i = std::cin, std::ostream & o = std::cout, const std::string & p = "> " );

    int retrieve_action ( );
};

#endif // _PCODE_INPUT_PROCESSOR

