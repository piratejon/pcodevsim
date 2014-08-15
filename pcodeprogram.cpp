
#include <sstream>
#include <istream>
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
          int label_value = insert_instruction(pl);
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

