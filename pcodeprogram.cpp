
#include <algorithm>
#include <sstream>
#include <istream>
#include <iomanip>
#include <vector>

#include "pcodeprogram.h"
#include "pcodeline.h"

void PCodeProgram::insert_label ( const std::string & label, int offset ) {
  if ( ! hasLabel(label) ) {
    labels.insert(std::pair<std::string, int>(label, offset));
  } else {
    std::ostringstream o;
    o << "Attempted to redefine " << label << "(" << labels.at(label) << ") as " << offset;
    throw(o.str().c_str());
  }
}

int PCodeProgram::insert_instruction ( PCodeLine & pl ) {
  program_listing.push_back(pl);
  return program_listing.size() - 1;
}

void PCodeProgram::input_file ( std::istream & in ) {
  std::string line;

  program_listing.clear();
  labels.clear();

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
            label_value = program_listing.size();
          } else {
            label_value = insert_instruction(pl);
          }
          insert_label(pl.getLabel(), label_value);
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

int PCodeProgram::getLabel ( const std::string & l ) {
  std::map<std::string, int>::iterator it = labels.find(l);
  return it == labels.end() ? -1 : it->second;
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

  for ( it = program_listing.begin(); it != program_listing.end(); ++ it ) {
    o << it - program_listing.begin() << "\t";
    instruction_listing_format(o, *it);
    o << "\n";
  }
}

int PCodeProgram::getEntryPoint ( ) {
  // defined as the "mst" with the greatest address
  for ( std::vector<PCodeLine>::reverse_iterator it = program_listing.rbegin();
      it != program_listing.rend();
      ++ it ) {
    if ( it->getOpcode() == "mst" ) {
      return program_listing.size() - (it - program_listing.rbegin()) - 1;
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

  table_height = std::max(instruction_store.size(), data_store.size());

  it = instruction_store.begin();
  dt = data_store.rbegin();

  for ( int i = 0; i < table_height; ++ i ) {
    if ( table_height > instruction_store.size() ) {
      if ( table_height - i <= instruction_store.size() ) {
        print_instruction_store();
      }
    } else {
      print_instruction_store();
    }

    if ( table_height > data_store.size() ) {
      if ( table_height - i <= data_store.size() ) {
        print_data_store();
      }
    } else {
      print_data_store();
    }
  }
}

void PCodeProgram::initialize_execution_environment ( ) {
  R.pc = getEntryPoint();
  R.mp = R.sp = R.ep = R.np = 0;

  data_store.clear();
}

