/***
  jstone25@uco.edu
  This file implements the PCodeLine class defined in pcodeline.h
  ***/
#include <ostream>
#include <string>

#include "pcodeline.h"

/***
  This function parses a line into its constituent components. Whitespace
  sensitive.
L00004    ent       sp        L00005    
  ***/
PCodeLine::PCodeLine(std::string & line) {
  if ( line.length() > 30 ) {
    std::string s;
    valid = true;

    s = line.substr(0,10);
    label = trim(s);

    s = line.substr(10,10);
    opcode = trim(s);

    s = line.substr(20,10);
    op1 = trim(s);

    s = line.substr(30, line.length() - 30);
    op2 = trim(s);
  } else {
    // ("Line '" + line + "' has length " + line.length());
    valid = false;
  }
}

std::string PCodeLine::trim ( std::string & s ) {
  std::string::iterator start;
  std::string::reverse_iterator end;

  for ( start = s.begin();
      start != s.end() && std::isspace(*start);
      ++ start );

  if ( start == s.end() ) return std::string();

  for ( end = s.rbegin();
      end != s.rend() && std::isspace(*end);
      ++ end );

  return std::string(start, end.base());
}

std::string PCodeLine::getLabel() {
  return label;
}

std::string PCodeLine::getOpcode() {
  return opcode;
}

std::string PCodeLine::getOp1() {
  return op1;
}

std::string PCodeLine::getOp2() {
  return op2;
}

void PCodeLine::print(std::ostream & os) {
  os << "'" << label
    << "', '" << opcode
    << "', '" << op1
    << "', '" << op2
    << "'\n";
}

bool PCodeLine::isValid() {
  return valid;
}

