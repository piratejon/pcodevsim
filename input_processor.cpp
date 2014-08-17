#include "input_processor.h"

InputProcessor::InputProcessor ( std::istream & i, std::ostream & o, const std::string & p ) {
  in = & i;
  out = & o;
  prompt = p;
}

int InputProcessor::retrieve_action ( ) {
  std::string command;

  while ( *in ) {
    if ( prompt.length() > 0 ) {
      *out << prompt;
    }

    *in >> command;

    if ( command.length() == 0 ) {
      command = last_command;
    }
    last_command = command;
    if ( command == "q" || command == "quit" ) return pc_quit;
    if ( command == "s" || command == "step" ) return pc_step;
    if ( command == "l" || command == "label" ) return pc_label;
    // if ( command == "h" || command == "?" || command == "help" ) return pc_help;

    if ( command != "" ) *out << "unrecognized command\n";
  }

  return pc_quit;
}

