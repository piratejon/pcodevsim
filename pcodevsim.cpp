

#include <iostream>

#include "pcodeprogram.h"

int main ( int arfc, char ** arfv ) {

  PCodeProgram p(std::cin);

  p.initialize_execution_environment();

  p.display_execution_state(std::cout);

  while ( !p.isHalted() ) {
    p.step();
    p.display_execution_state(std::cout);
  }

  return 0;
}

