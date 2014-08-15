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
PCodeLine::PCodeLine ( const std::string & line ) {
  valid = false;

  if ( line.length() > 30 ) {
    fill_me_up(line.substr(0,10), line.substr(10,10), line.substr(20,10), line.substr(30, line.length() - 30));
    valid = true;
  } else {
    // ("Line '" + line + "' has length " + line.length());
    valid = false;
  }
}

PCodeLine::PCodeLine ( const std::string & _label, const std::string & _opcode, const std::string & _op1, const std::string & _op2 ) {
  valid = false;
  fill_me_up(_label, _opcode, _op1, _op2);
  valid = true;
}

void PCodeLine::fill_me_up ( const std::string & _label, const std::string & _opcode, const std::string & _op1, const std::string & _op2 ) {
  label = trim(_label);
  opcode = trim(_opcode);
  op1 = trim(_op1);
  op2 = trim(_op2);
}

std::string PCodeLine::trim ( const std::string & s ) {
  std::string::const_iterator start;
  std::string::const_reverse_iterator end;

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

bool PCodeLine::definesLabel() {
  return label == "#define";
}

