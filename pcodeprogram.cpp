
#include <sstream>
#include <istream>
#include <vector>

#include "pcodeprogram.h"
#include "pcodeline.h"

void PCodeProgram::insert_label ( const std::string & label, int offset ) {
  if ( labels.find(label) == labels.end() ) {
    labels.insert(std::pair<std::string, int>(label, offset));
  } else {
    std::ostringstream o;
    o << "Attempted to redefine " << label << "(" << labels.at(label) << ") as " << offset;
    throw(o.str());
  }
}

int PCodeProgram::insert_instruction ( PCodeLine & pl ) {
  program_listing.push_back(pl);
  return program_listing.size() - 1;
}

void PCodeProgram::input_file ( std::istream & in ) {
  int line_counter;
  std::string line;

  program_listing.clear();
  labels.clear();

  for ( line_counter = 0;
      std::getline(in, line);
      ++ line_counter ) {
    PCodeLine pl(line);
    if ( pl.isValid() ) {
      if ( pl.definesLabel() ) {
        // explicitly defined "#define", "Lxxxx", "9001"
        int label_value;
        std::istringstream(pl.getOp1()) >> label_value;
        insert_label(pl.getOpcode(), label_value);
      } else if ( pl.getLabel() != "" ) {
        // implicitly defined label
        int label_value = insert_instruction(pl);
        insert_label(pl.getLabel(), label_value);
      } else {
        // normal instruction
        insert_instruction(pl);
      }
    } else {
      std::ostringstream o;
      o << "Invalid instruction after " << line_counter << " lines.";
      throw(o.str());
    }
  }
}

PCodeProgram::PCodeProgram ( std::istream & in ) {
  input_file ( in );
}

