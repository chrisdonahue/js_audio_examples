import fnmatch
import os
import shutil

import sass

def _match_files_recursive(path_dir, pattern):
	file_paths = []
	for root, dirnames, filenames in os.walk(path_dir):
		for filename in fnmatch.filter(filenames, pattern):
			file_paths.append(os.path.join(root, filename))
	return file_paths

# init directory path variables
path_dir_output = './compiled'
path_dir_core = './core'
path_dir_examples = './examples'

# rm output directory if exists and create it
if os.path.exists(path_dir_output):
	shutil.rmtree(path_dir_output, True)
os.makedirs(path_dir_output)

# copy files to output folder
shutil.copytree(path_dir_core, path_dir_output + os.path.sep + path_dir_core)
shutil.copytree(path_dir_examples, path_dir_output + os.path.sep + path_dir_examples)

# find and compile scss files
print '---- Compiling SASS Stylesheets ----'
scss_file_paths = _match_files_recursive(path_dir_output, '*.scss')
for scss_file_path in scss_file_paths:
	# open scss
	scss_file = open(scss_file_path, 'r')
	scss_file_contents = scss_file.read()
	scss_file.close()

	# delete sass file
	os.remove(scss_file_path)

	# compile to css
	try:
		css_file_contents = sass.compile_string(scss_file_contents)
	except Exception as e:
		print 'Error in SASS file {0}:\n{1}'.format(scss_file_path, str(e))
		continue

	# generate css file path
	scss_file_path_head, scss_file_path_tail = os.path.split(scss_file_path)
	scss_file_name = os.path.splitext(scss_file_path_tail)[0]
	css_file_path_tail = scss_file_name + '.css'
	css_file_path = os.path.join(scss_file_path_head, css_file_path_tail)

	# save css file
	css_file = open(css_file_path, 'w')
	css_file.write(css_file_contents)
	css_file.close()

# find and compile html templates
print '---- Compiling HTML Templates ----'
