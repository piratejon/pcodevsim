
#include <iostream>

#include "pcodeline.h"

int main ( int arfc, char ** arfv ) {

  PCodeLine * pl;
  std::string s;

  s = "L00004    ent       sp        L00005    ";

  pl = new PCodeLine(s);

  std::cout << "'" << pl->getLabel()
    << "', '" << pl->getOpcode()
    << "', '" << pl->getOp1()
    << "', '" << pl->getOp2()
    << "'\n";

  delete pl;

  return 0;
}

