

#include <iostream>
#include <fstream>

#include "input_processor.h"
#include "pcodeprogram.h"

int main ( int arfc, char ** arfv ) {

  bool user_quit = false;

  std::ifstream in("pcd/gcd.pcd", std::ifstream::in);

  PCodeProgram p(in);
  InputProcessor ip;

  p.initialize_execution_environment();

  do {
    p.display_execution_state(std::cout);
    switch ( ip.retrieve_action() ) {
      case pc_quit:
        user_quit = true;
        break;

      case pc_step:
        p.step();
        break;
    }
  } while ( !user_quit && !p.isHalted() );

  return 0;
}

