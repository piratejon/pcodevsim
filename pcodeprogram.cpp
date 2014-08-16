
#include <algorithm>
#include <sstream>
#include <istream>
#include <iomanip>
#include <vector>

#include "pcodeprogram.h"
#include "pcodeline.h"
#include "value.h"

void PCodeProgram::insert_label ( const std::string & label, int offset ) {
  if ( ! hasLabel(label) ) {
    labels.insert(std::pair<std::string, int>(label, offset));
  } else {
    std::ostringstream o;
    o << "Attempted to redefine " << label << "(" << labels.at(label) << ") as " << offset;
    throw(o.str().c_str());
  }
}

void PCodeProgram::insert_reverse_label ( int offset, const std::string & label ) {
  if ( lookupLine(offset) == "" ) {
    reverse_labels.insert(std::pair<int, std::string>(offset, label));
  } else {
    std::ostringstream o;
    o << "Attempted to assign label " << label << " to line " << offset << " with label " << lookupLine(offset);
    throw(o.str().c_str());
  }
}

int PCodeProgram::insert_instruction ( PCodeLine & pl ) {
  istore.push_back(pl);
  return istore.size() - 1;
}

void PCodeProgram::input_file ( std::istream & in ) {
  std::string line;

  istore.clear();
  labels.clear();
  reverse_labels.clear();

  for ( lines_read = 0;
      std::getline(in, line);
      ++ lines_read ) {
    PCodeLine pl(line);
    // skip blank lines
    if ( line.length() > 0 ) {
      if ( pl.isValid() ) {
        if ( pl.definesLabel() ) {
          // explicitly defined label: "#define", "Lxxxx", "9001", ""
          int label_value;
          std::istringstream(pl.getOp1()) >> label_value;
          insert_label(pl.getOpcode(), label_value);
        } else if ( pl.getLabel() != "" ) {
          // implicitly defined label: "LXXXX", opcode, op1, op2
          int label_value;
          if ( pl.getOpcode() == "" && pl.getOp1() == "" && pl.getOp2() == "" ) {
            label_value = istore.size();
          } else {
            label_value = insert_instruction(pl);
          }
          insert_label(pl.getLabel(), label_value);
          insert_reverse_label(label_value, pl.getLabel());
        } else {
          // normal instruction
          insert_instruction(pl);
        }
      } else {
        std::ostringstream o;
        o << "Invalid instruction after " << lines_read << " lines.";
        throw(o.str().c_str());
      }
    }
  }
}

PCodeProgram::PCodeProgram ( std::istream & in ) {
  halted = true;
  input_file ( in );
}

int PCodeProgram::getLinesRead() {
  return lines_read;
}

int PCodeProgram::getLabelCount() {
  return labels.size();
}

bool PCodeProgram::hasLabel ( const std::string & l ) {
  return labels.find(l) != labels.end();
}

int PCodeProgram::lookupLabel ( const std::string & l ) {
  std::map<std::string, int>::iterator it = labels.find(l);
  return it == labels.end() ? -1 : it->second;
}

const std::string PCodeProgram::lookupLine ( int line ) {
  std::map<int, std::string>::iterator it = reverse_labels.find(line);
  return it == reverse_labels.end() ? "" : it->second;
}

void PCodeProgram::instruction_listing_format ( std::ostream & o, PCodeLine & pl ) {
  o << pl.getOpcode() << "\t";

  if ( hasLabel(pl.getOp1()) ) {
    o << labels[pl.getOp1()] << "\t";
  } else {
    o << pl.getOp1() << "\t";
  }

  if ( hasLabel(pl.getOp2()) ) {
    o << labels[pl.getOp2()] << "\t";
  } else {
    o << pl.getOp2() << "\t";
  }
}

void PCodeProgram::print_instruction_store ( std::ostream & o ) {
  std::vector<PCodeLine>::iterator it;

  for ( it = istore.begin(); it != istore.end(); ++ it ) {
    o << it - istore.begin() << "\t";
    instruction_listing_format(o, *it);
    o << "\n";
  }
}

int PCodeProgram::getEntryPoint ( ) {
  // defined as the "mst" with the greatest address
  for ( std::vector<PCodeLine>::reverse_iterator it = istore.rbegin();
      it != istore.rend();
      ++ it ) {
    if ( it->getOpcode() == "mst" ) {
      return istore.size() - (it - istore.rbegin()) - 1;
    }
  }

  return -1;
}

void PCodeProgram::display_execution_state ( std::ostream & o ) {

  int table_height;

  std::vector<PCodeLine>::iterator it;
  std::vector<DataCell>::reverse_iterator dt;

  o << "|=====================================================================================|\n";
  o << "|                                     Registers                                       |\n";
  o << "|-------------------------------------------------------------------------------------|\n";
  o << "|      pc        |       mp       |       sp       |       ep       |       np        |\n";
  o << "|-------------------------------------------------------------------------------------|\n";
  o << "|" << std::setw(8) << R.pc << std::setw(9) << "|" << std::setw(8) << R.mp << std::setw(9) << "|" << std::setw(8) << R.sp << std::setw(9) << "|" << std::setw(8) << R.ep << std::setw(9) << "|" << std::setw(8) << R.np << std::setw(11) << "|\n";
  o << "|=====================================================================================|\n";
  o << "|             Instruction Store            |                 Data Store               |\n";
  o << "|-------------------------------------------------------------------------------------|\n";
  o << "| Address | Opcode | Operand 1 | Operand 2 | Subprogram | Address | Id | Type | Value |\n";
  o << "|-------------------------------------------------------------------------------------|\n";

  table_height = std::max(istore.size(), dstore.size());

  it = istore.begin();
  dt = dstore.rbegin();

  for ( int i = 0; i < table_height; ++ i ) {
    if ( it != istore.end()
        && (
          table_height > istore.size()
          || table_height - i <= istore.size()
          )
       ) {
      o << "|"
        << std::setfill( ((it - istore.begin()) == R.pc) ? '*' : ' ' )
        << std::setw(9) << it - istore.begin() << "|"
        << std::setw(8) << it->getOpcode() << "|"
        << std::setw(11) << it->getOp1() << "|"
        << std::setw(11) << it->getOp2() << "|";
      ++ it;
    } else {
        o << "|         |        |           |           |";
    }

    o << std::setfill(' ');

    // figure out what subprogram we are in lol
    o << std::setw(12) << "            |";

    if ( dt != dstore.rend() && (
          table_height > dstore.size()
          || table_height - i <= dstore.size()
          )
       ) {
      o << std::setw(9) << dstore.size() - (dt - dstore.rbegin()) - 1 << "|"
        << std::setw(4) << dt->id << "|"
        << std::setw(6) << dt->v.getType() << "|"
        << std::setw(7) << dt->v.value_as_string() << "|";
      ++ dt;
    } else {
      o << "         |    |      |       |";
    }
    o << "\n";
  }
  o << "|=====================================================================================|\n";
}

void PCodeProgram::initialize_execution_environment ( ) {
  R.pc = getEntryPoint();

  R.mp = 0;
  R.sp = 0;
  R.ep = 0;
  R.np = 32767; // hmm?

  halted = false;

  dstore.clear();
}

bool PCodeProgram::isHalted ( ) {
  return halted;
}

void PCodeProgram::dstore_push ( const std::string & id, int type, const std::string & r ) {
  Value v(type, r);
  DataCell d = { id, v };
  dstore.push_back(d);
  ++ R.sp;
}

void PCodeProgram::step ( ) {
  // get the next instruction
  PCodeLine p = istore[R.pc];

  std::string o = p.getOpcode();
  std::string o1 = p.getOp1();
  std::string o2 = p.getOp2();

  if ( o == "stp" ) {
    hlt();
  } else if ( o == "mst" ) {
    mst(o1);
  } else if ( o == "cup" ) {
    cup(o1, o2);
  } else {
    std::ostringstream err;
    err << "unrecognized opcode "  <<  o  <<  " at "  <<  R.pc;
    throw(err.str().c_str());
  }

  // take action
}

int PCodeProgram::int_from_string ( const std::string & s ) {
  int i;
  std::istringstream ss(s);
  ss >> i;
  return i;
}

std::string PCodeProgram::string_from_int ( int i ) {
  std::ostringstream ss;
  ss << i;
  return ss.str();
}

int PCodeProgram::base ( int level, int offset ) {
  if ( level == 0 ) return offset;
  else return base ( level - 1, dstore[offset+1].v.value_as_integer() );
}

void PCodeProgram::mst ( const std::string & level ) {

  // R.sp + 0 is return value
  dstore_push ( "rv", t_integer, "" );

  // R.sp + 1 is static link
  dstore_push ( "sl", t_integer, string_from_int ( base ( int_from_string(level), R.mp ) ) );
  // R.sp + 2 is dynamic link
  dstore_push ( "dl", t_integer, string_from_int ( R.mp ) );
  // R.sp + 3 is extreme pointer
  dstore_push ( "ep", t_integer, string_from_int ( R.ep ) );
  // R.sp + 4 is return address

  // R.sp + 5 is where we start the parameters if any and then the locals

  R.mp = dstore.size();
  ++ R.pc;
}

void PCodeProgram::hlt ( ) {
  halted = true;
}

void PCodeProgram::cup ( const std::string & argsize, const std::string & iaddr ) {
  int p = int_from_string ( argsize );
  int q = int_from_string ( iaddr );

  R.mp = R.sp - ( p + 4 );

  dstore_push ( "ra", t_integer, string_from_int ( R.pc + 1 ) );

  R.pc = q;
}

