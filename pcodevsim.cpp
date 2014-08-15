

#include <iostream>

#include "pcodeprogram.h"

int main ( int arfc, char ** arfv ) {

  PCodeProgram p(std::cin);

  p.print_instruction_store(std::cout);

  return 0;
}

