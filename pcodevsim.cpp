

#include <iostream>
#include <fstream>

#include "input_processor.h"
#include "pcodeprogram.h"

int main ( int arfc, char ** arfv ) {

  bool user_quit = false;

  std::ifstream in(arfv[1], std::ifstream::in);

  PCodeProgram p(in);
  InputProcessor ip;

  p.initialize_execution_environment();
  p.display_execution_state(std::cout);

  do {
    switch ( ip.retrieve_action() ) {
      case pc_quit:
        user_quit = true;
        break;

      case pc_step:
        p.step();
        p.display_execution_state(std::cout);
        break;

      case pc_label:
        p.print_labels(std::cout);
        break;
    }
  } while ( !user_quit && !p.isHalted() );

  return 0;
}

